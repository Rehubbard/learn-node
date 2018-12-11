const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter: function(req, file, next) {
    // filtering photos based on file types
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true); // in node, callbacks that are called with (null, YOUR_VALUE_HERE) are assumed to be successful
    } else {
      next({ message: 'That filetype is not allowed' }, false); // in node, callbacks that are called with (YOUR_VALUE_HERE) are assumed to be errors
    }
  }
};

exports.homePage = (req, res) => {
  res.render('index', { name: req.name });
};

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' });
};

// reads the file into memory on the server. Puts a file property on the request object
exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if there is no new file to resize. If not, we pass to the next middleware with next()
  if (!req.file) {
    next();
    return;
  }

  // This function has 3 main operations
  // 1. Resize photo
  // 2. Save photo to disk (hard drive)
  // 3. Save reference to photo's filepath

  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`; // 3. save reference to photo's filepath. This is what Mongoose uses to store in db

  // resize photo
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO); // 1. Resize photo
  await photo.write(`./public/uploads/${req.body.photo}`); //2. Save photo to disk

  //once we have written the photo to our filesystem, keep going! We will save the photo's filepath to our database
  next();
};

exports.createStore = async (req, res) => {
  req.body.author = req.user._id; // assigning the relational property
  const store = await new Store(req.body).save();
  req.flash(
    'success',
    `Successfully created ${store.name}. Care to leave a review?`
  );
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 4;
  const skip = page * limit - limit;

  // query database for all stores
  const storesPromise = Store.find()
    .skip(skip)
    .limit(4)
    .sort({ created: 'desc' });

  const countPromise = Store.count();

  const [stores, count] = await Promise.all([storesPromise, countPromise]);

  const pages = Math.ceil(count / limit); // Math.ceil accounts for uneven divisions. 17 stores would be 17 / 4 and that would be 5 pages with Math.ceil

  if (!stores.length && skip) {
    // if they come straight in with a page number param that is higer than what we have
    req.flash(
      'info',
      `Hey! You asked for page ${page}, but the most we have is ${pages}`
    );
    res.redirect(`/stores/page/${pages}`);
    return;
  }
  // render templates with the stores in the locals
  res.render('stores', { title: 'Stores', stores, page, pages, count });
};

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug }).populate(
    'author reviews'
  );

  if (!store) return next();

  res.render('store', { title: 'Store', store });
};

const confirmStoreOwner = (store, user) => {
  if (!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it!');
  }
};

exports.editStore = async (req, res) => {
  //1. Find the store given the id
  //2. confirm they are the owner of the store
  //3. Render out the edit form

  const store = await Store.findById(req.params.id);

  confirmStoreOwner(store, req.user);

  res.render('editStore', { title: 'Edit Store', store });
};

exports.updateStore = async (req, res) => {
  // set location data to be a type of "Point"
  req.body.location.type = 'Point';

  // find and update the store
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, //return the new store instead of the old one
    runValidators: true // forces model to run the schema required validators. By default, it only runs on create
  }).exec();

  // Redirect them to the store and tell them it worked
  req.flash(
    'success',
    `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${
      store.slug
    }">View Store -> </a>`
  );
  res.redirect(`/stores/${store.id}/edit`);
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true }; //if no tag is in params, just give us stores with a tag property. Doesn't need to match
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
  res.render('tag', { tags, tag, stores, title: 'Tags' });
};

exports.searchStores = async (req, res) => {
  const stores = await Store
    // find store that match text index field
    .find(
      {
        $text: {
          $search: req.query.q
        }
      },
      {
        score: {
          $meta: 'textScore'
        }
      }
    )
    // sort them by the meta property of textScore (built into MongoDB)
    .sort({
      score: { $meta: 'textScore' }
    })
    //limit to only 5 results
    .limit(5);
  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000 //10km
      }
    }
  };

  const stores = await Store.find(q)
    .select('slug name description location photo') // .select -> gives us only the data fields we specify
    .limit(10);
  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
  // toggle heart on each request
  const hearts = req.user.hearts.map(obj => obj.toString());
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet'; //determine which MongoDB operator to use
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { [operator]: { hearts: req.params.id } },
    { new: true } // returns the updated user
  );
  res.json(user);
};

exports.getHeartedStores = async (req, res) => {
  const heartedStores = await Store.find({
    _id: { $in: req.user.hearts }
  });
  res.render('stores', { title: 'Hearted Stores', stores: heartedStores });
};

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  res.render('topStores', { stores, title: '★ Top Stores!' });
};
