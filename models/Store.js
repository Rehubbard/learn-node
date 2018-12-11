const mongoose = require('mongoose');
mongoose.Promise = global.Promise; // using the built-in es6 Promise in Mongoose
const slug = require('slugs');

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true, //trims whitespace on both ends
      required: 'Please enter a store name.'
    },
    slug: String,
    description: {
      type: String,
      trim: true
    },
    tags: [String],
    created: {
      type: Date,
      default: Date.now
    },
    location: {
      type: {
        type: String,
        default: 'Point'
      },
      coordinates: [
        {
          type: Number,
          required: 'You must supply coordinates!'
        }
      ],
      address: {
        type: String,
        required: 'You must supply an address'
      }
    },
    photo: String,
    author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: 'You must supply an author'
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

//Define our indexes
storeSchema.index({
  name: 'text',
  description: 'text'
});

storeSchema.index({
  location: '2dsphere'
});

storeSchema.pre('save', async function(next) {
  if (!this.isModified('name')) {
    next(); // if name is not modified, skip the slug proces. No need to create a new slug every time
    return;
  }
  this.slug = slug(this.name);
  // find possible duplicate named stores
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx }); // access the model with this.constructor

  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();

  // TODO make slugs more unique
});

storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

storeSchema.statics.getTopStores = function() {
  // this.aggregate returns a Promise
  return this.aggregate([
    // 1. Lookup stores and populate reviews
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'store',
        as: 'reviews'
      }
    },
    // 2. Filter for only Stores that have 2 or more reviews
    {
      $match: { 'reviews.1': { $exists: true } }
    },
    // 3. Add the average reviews field
    {
      $addFields: {
        averageRating: { $avg: '$reviews.rating' } // the $ before reviews means to use the reviews data directly from the pipeline
      }
    },
    // 4. Sort it by the average review field
    {
      $sort: { averageRating: -1 }
    },
    // 5. limit to at most 10 stores
    {
      $limit: 10
    }
  ]);
};
// find reviews where the store _id property === reviews store property
storeSchema.virtual('reviews', {
  ref: 'Review', // what model to link?
  localField: '_id', // which field on the store
  foreignField: 'store' // which field on the review
});

function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);
