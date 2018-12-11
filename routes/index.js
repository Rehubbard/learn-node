const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const reviewController = require('../controllers/reviewController');

const { catchErrors } = require('../handlers/errorHandlers');

// Do work here
router.get('/', catchErrors(storeController.getStores));
router.get('/stores', catchErrors(storeController.getStores));
router.get('/stores/page/:page', catchErrors(storeController.getStores));
router.get('/add', authController.isLoggedIn, storeController.addStore);
router.get('/stores/:id/edit', catchErrors(storeController.editStore)); // url contains a dynamic value. This will be awailable on req.params. ex: req.params.id
router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));

router.post(
  '/add',
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.createStore)
);
router.post(
  '/add/:id',
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.updateStore)
);

router.get('/tags', catchErrors(storeController.getStoresByTag));
router.get('/tags/:tag', catchErrors(storeController.getStoresByTag));

router.get('/login', userController.loginForm);
router.post('/login', authController.login);
router.get('/register', userController.registerForm);

// 1. validate the registration data
// 2. register the user
// 3. log the user in

router.post(
  '/register',
  userController.validateRegister,
  userController.register,
  authController.login
);

router.get('/logout', authController.logout);

router.get('/account', authController.isLoggedIn, userController.account);
router.post('/account', catchErrors(userController.updateAccount));
router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset));
router.post(
  '/account/reset/:token',
  authController.confirmPasswords,
  catchErrors(authController.update)
);

router.get('/map', storeController.mapPage);
router.get(
  '/hearts',
  authController.isLoggedIn,
  catchErrors(storeController.getHeartedStores)
);
router.post(
  '/reviews/:id',
  authController.isLoggedIn,
  catchErrors(reviewController.addReview)
);
router.get('/top', catchErrors(storeController.getTopStores));

/* API 
  these endpoints send back JSON (res.json) as opposed to rendering views or redirecting to pages
*/

router.get('/api/search', catchErrors(storeController.searchStores));
router.get('/api/stores/near', catchErrors(storeController.mapStores));
router.post('/api/stores/:id/heart', catchErrors(storeController.heartStore));

module.exports = router;
