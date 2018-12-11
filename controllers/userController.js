const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisfy = require('es6-promisify');

exports.loginForm = (req, res) => {
  res.render('login', { title: 'Login' });
};

exports.registerForm = (req, res) => {
  res.render('register', { title: 'Register' });
};

exports.validateRegister = (req, res, next) => {
  // using express-validator here
  req.sanitizeBody('name');
  req.checkBody('name', 'You must supply a name').notEmpty();
  req.checkBody('email', 'Email invalid').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req.checkBody('password', 'Password cannot be blank').notEmpty();
  req
    .checkBody('password-confirm', 'Confirmed password cannot be blank')
    .notEmpty();
  req
    .checkBody('password-confirm', 'Passwords do not match')
    .equals(req.body.password);

  const errors = req.validationErrors(); // runs the validations above

  if (errors) {
    req.flash('error', errors.map(err => err.msg));
    res.render('register', {
      title: 'Register',
      body: req.body,
      flashes: req.flash()
    }); //explicitly passing flashes since it's happening on one request
    return;
  }

  next(); // no errors, move to the next middleware
};

exports.register = async (req, res, next) => {
  const user = new User({ email: req.body.email, name: req.body.name });
  const registerWithPromise = promisfy(User.register, User);
  await registerWithPromise(user, req.body.password);

  next();
};

exports.account = (req, res) => {
  res.render('account', { title: 'Edit Your Account' });
};

exports.updateAccount = async (req, res) => {
  const updates = {
    name: req.body.name,
    email: req.body.email
  };

  const user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $set: updates }, // sets it on top of the data that already exists. Do not replace everything
    { new: true, runValidators: true, context: 'query' }
  );
  req.flash('success', 'Updated the Profile');
  res.redirect('back');
};
