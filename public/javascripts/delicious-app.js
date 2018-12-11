import '../sass/style.scss';

import { $, $$ } from './modules/bling';
import autocomplete from './modules/autocomplete';
import typeAhead from './modules/typeAhead';
import makeMap from './modules/map';
import ajaxHeart from './modules/heart';

autocomplete($('#address'), $('#lat'), $('#lng')); // selecting the inputs with Bling and sending them to autocomplete functions. same as document.querySelector('#address')

typeAhead($('.search'));

makeMap($('#map'));

const heartForms = $$('form.heart');
heartForms.on('submit', ajaxHeart); // with bling, you can listen to events on multiple nodes in NodeList
