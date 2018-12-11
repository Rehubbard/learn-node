function autocomplete(input, latInput, lngInput) {
  console.log(input, latInput, lngInput);

  if (!input) return; // skip this if no input on page

  const dropdown = new google.maps.places.Autocomplete(input);

  dropdown.addListener('place_changed', () => {
    // place_change is a custom event for the Google Places api
    const place = dropdown.getPlace();
    latInput.value = place.geometry.location.lat();
    lngInput.value = place.geometry.location.lng();
  });

  // don't submit on enter for address field
  input.on('keypress', event => {
    if (event.key === 'Enter') event.preventDefault();
  });
}

export default autocomplete;
