const mongoose = require('mongoose');

const PACKAGE_DURATION = {
  '1_month': 30,
  '2_months': 60,
  '3_months': 90,
  '6_months': 180,
  '1_year': 365,
};

const memberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Member name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
    },
    packageType: {
      type: String,
      required: [true, 'Package type is required'],
      enum: ['1_month', '2_months', '3_months', '6_months', '1_year'],
    },
    packageDurationDays: {
      type: Number,
    },
    expiryDate: {
      type: Date,
    },
    joiningTime: {
      type: String,
      required: [true, 'Joining time is required'],
      default: 'morning',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Auto-calculate packageDurationDays and expiryDate before saving
memberSchema.pre('save', function (next) {
  const days = PACKAGE_DURATION[this.packageType];
  this.packageDurationDays = days;

  const joining = new Date(this.joiningDate);
  const expiry = new Date(joining);
  expiry.setDate(expiry.getDate() + days);
  this.expiryDate = expiry;

  next();
});

// Also recalculate on update
memberSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.packageType || update.joiningDate) {
    const packageType = update.packageType || this._conditions.packageType;
    const joiningDate = update.joiningDate || this._conditions.joiningDate;

    if (packageType && joiningDate) {
      const days = PACKAGE_DURATION[packageType];
      update.packageDurationDays = days;

      const joining = new Date(joiningDate);
      const expiry = new Date(joining);
      expiry.setDate(expiry.getDate() + days);
      update.expiryDate = expiry;
    }
  }
  next();
});

// Virtual: remaining days
memberSchema.virtual('remainingDays').get(function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(this.expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  return diff;
});

memberSchema.set('toJSON', { virtuals: true });
memberSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Member', memberSchema);
