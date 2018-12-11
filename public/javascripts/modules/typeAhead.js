import axios from 'axios';
import dompurify from 'dompurify';

function searchResultsHTML(stores) {
  return stores
    .map(store => {
      return `
      <a href="/store/${store.slug}" class="search__result">
        <strong>${store.name}</strong>
      </a>
    `;
    })
    .join('');
  // we call .join('') because otherwise we would get an array of separate html elements
}

function typeAhead(search) {
  if (!search) return; // if the search input does not exist on the current page, this ends the function

  const searchInput = search.querySelector('input[name="search"]');
  const searchResults = search.querySelector('.search__results');
  const searchResultsCount = searchResults.children.length;
  const activeSearchResult = search.querySelector('.search__result--active');

  searchInput.on('input', function() {
    // if no value, clear it
    if (!this.value) {
      searchResults.style.display = 'none';
      searchResults.innerHTML = '';
      return;
    }

    // show search results
    searchResults.style.display = 'block';

    axios
      .get(`/api/search?q=${this.value}`)
      .then(res => {
        if (res.data.length) {
          searchResults.innerHTML = dompurify.sanitize(
            searchResultsHTML(res.data)
          );
          return;
        }

        // tell them no results found
        searchResults.innerHTML = dompurify.sanitize(
          `<div class='search__result'>No Results for ${
            this.value
          } found. Please try another search term!</div>`
        );
      })
      .catch(err => {
        console.error(err); // in a real app, you could call your error monitoring service here (ex: Sentry, Rollbar)
      });
  });

  // handle keyboard inputs
  searchInput.on('keyup', e => {
    // if they aren't pressing up, down, or enter, who cares
    if (![38, 40, 13].includes(e.keyCode)) {
      return; // skip it
    }

    const activeClass = 'search__result--active';
    const current = search.querySelector(`.${activeClass}`);
    const items = search.querySelectorAll('.search__result');
    let next;

    // 40 = down key, 38 = up key, 13 = enter key
    if (e.keyCode === 40 && current) {
      next = current.nextElementSibling || items[0];
    } else if (e.keyCode === 40) {
      next = items[0]; // on initial down press, highlight the first
    } else if (e.keyCode === 38 && current) {
      next = current.previousElementSibling || items[items.length - 1];
    } else if (e.keyCode === 38) {
      next = items[items.length - 1]; //on initial up press, highlight the last
    } else if (e.keyCode === 13 && current.href) {
      window.location = current.href;
      return;
    }

    if (current) {
      current.classList.remove(activeClass);
    }
    next.classList.add(activeClass); // actually add the class the appropriate search result HTML element based on above logic
  });
}

export default typeAhead;
