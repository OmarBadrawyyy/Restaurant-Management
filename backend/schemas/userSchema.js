// userSchema.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price must be a positive number'],
  },
  quantity: {
    type: Number,
    default: 1,
    min: [1, 'Quantity must be at least 1'],
  },
});

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: User's unique username
 *         fullName:
 *           type: string
 *           description: User's full name
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           format: password
 *           description: User's password (hashed)
 *         phone:
 *           type: string
 *           description: User's phone number
 *         role:
 *           type: string
 *           enum: [customer, staff, manager, admin]
 *           description: User's role in the system
 *         isActive:
 *           type: boolean
 *           description: Whether the user account is active
 *         isVerified:
 *           type: boolean
 *           description: Whether the user's email is verified
 *         verificationToken:
 *           type: string
 *           description: Token for email verification
 *         resetPasswordToken:
 *           type: string
 *           description: Token for password reset
 *         resetPasswordExpires:
 *           type: string
 *           format: date-time
 *           description: Expiration time for password reset token
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Last login timestamp
 *         addresses:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               street:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               zipCode:
 *                 type: string
 *               country:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *           description: User's saved addresses
 *         paymentMethods:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               lastFour:
 *                 type: string
 *               expiryMonth:
 *                 type: string
 *               expiryYear:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *           description: User's saved payment methods (tokenized)
 *         preferences:
 *           type: object
 *           properties:
 *             favoriteItems:
 *               type: array
 *               items:
 *                 type: string
 *             dietaryRestrictions:
 *               type: array
 *               items:
 *                 type: string
 *             allergens:
 *               type: array
 *               items:
 *                 type: string
 *             communicationPreferences:
 *               type: object
 *               properties:
 *                 email:
 *                   type: boolean
 *                 sms:
 *                   type: boolean
 *                 push:
 *                   type: boolean
 *           description: User's preferences
 *         loyaltyPoints:
 *           type: number
 *           description: User's loyalty points
 *         birthDate:
 *           type: string
 *           format: date
 *           description: User's birth date
 *         notes:
 *           type: string
 *           description: Admin notes about the user
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 *           description: Specific permissions assigned to the user
 */
const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^(\+\d{1,3}[- ]?)?\d{10}$/, 'Please provide a valid phone number']
    },
    role: {
      type: String,
      enum: ['customer', 'staff', 'manager', 'admin'],
      default: 'customer',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'suspended'],
      default: 'active'
    },
    passwordResetRequired: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: {
      type: String
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    addresses: [{
      addressType: {
        type: String,
        enum: ['home', 'work', 'other'],
        default: 'home'
      },
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      isDefault: {
        type: Boolean,
        default: false
      }
    }],
    paymentMethods: [{
      type: {
        type: String,
        enum: ['credit', 'debit', 'paypal'],
        required: true
      },
      // Store only last 4 digits for security
      lastFour: {
        type: String,
        required: true,
        match: [/^\d{4}$/, 'Last four digits must be numeric']
      },
      expiryMonth: {
        type: String,
        match: [/^(0[1-9]|1[0-2])$/, 'Expiry month must be between 01-12']
      },
      expiryYear: {
        type: String,
        match: [/^\d{4}$/, 'Expiry year must be 4 digits']
      },
      isDefault: {
        type: Boolean,
        default: false
      },
      // Token from payment processor (e.g., Stripe)
      token: {
        type: String
      }
    }],
    preferences: {
      favoriteItems: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem'
      }],
      dietaryRestrictions: [{
        type: String,
        enum: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free', 'low_carb', 'keto', 'halal', 'kosher']
      }],
      allergens: [{
        type: String,
        enum: ['peanuts', 'tree_nuts', 'milk', 'eggs', 'fish', 'shellfish', 'soy', 'wheat', 'sesame']
      }],
      communicationPreferences: {
        email: {
          type: Boolean,
          default: true
        },
        sms: {
          type: Boolean,
          default: false
        },
        push: {
          type: Boolean,
          default: false
        }
      }
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0
    },
    birthDate: {
      type: Date
    },
    notes: {
      type: String
    },
    permissions: [{
      type: String,
      enum: [
        'view_menu', 'edit_menu', 
        'view_orders', 'manage_orders', 
        'view_users', 'manage_users',
        'view_tables', 'manage_tables',
        'view_bookings', 'manage_bookings',
        'view_inventory', 'manage_inventory',
        'view_reports', 'manage_reports',
        'view_promotions', 'manage_promotions',
        'view_feedback', 'manage_feedback',
        'manage_settings'
      ]
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// COMMENTED OUT: This virtual was causing conflicts with the actual fullName field
// userSchema.virtual('fullName').get(function() {
//   return `${this.firstName} ${this.lastName}`;
// });

// Virtual for default address
userSchema.virtual('defaultAddress').get(function() {
  if (!this.addresses || this.addresses.length === 0) return null;
  
  const defaultAddress = this.addresses.find(addr => addr.isDefault);
  return defaultAddress || this.addresses[0];
});

// Virtual for default payment method
userSchema.virtual('defaultPaymentMethod').get(function() {
  if (!this.paymentMethods || this.paymentMethods.length === 0) return null;
  
  const defaultMethod = this.paymentMethods.find(method => method.isDefault);
  return defaultMethod || this.paymentMethods[0];
});

// Virtual for loyalty tier
userSchema.virtual('loyaltyTier').get(function() {
  if (this.loyaltyPoints < 100) return 'bronze';
  if (this.loyaltyPoints < 500) return 'silver';
  if (this.loyaltyPoints < 1000) return 'gold';
  return 'platinum';
});

// Method to check if user has specific permission
userSchema.methods.hasPermission = function(permission) {
  // Admins have all permissions
  if (this.role === 'admin') return true;
  
  // Managers have most permissions except some admin-only ones
  if (this.role === 'manager' && !['manage_users', 'manage_settings'].includes(permission)) {
    return true;
  }
  
  // Check specific permissions
  return this.permissions.includes(permission);
};

// Method to check if password matches
userSchema.methods.comparePassword = async function(candidatePassword) {
  console.log('Comparing passwords:');
  console.log('- Candidate password:', candidatePassword ? 'exists' : 'missing');
  console.log('- Stored hash:', this.password ? 'exists' : 'missing');
  
  try {
    if (!candidatePassword || !this.password) {
      console.log('Missing password or hash, returning false');
      return false;
    }
    
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('Password comparison result:', isMatch ? 'MATCH' : 'NO MATCH');
    return isMatch;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
};

// Method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      email: this.email, 
      role: this.role,
      permissions: this.permissions
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: '24h' }
  );
};

// Method to add loyalty points
userSchema.methods.addLoyaltyPoints = function(points) {
  this.loyaltyPoints += points;
  return this.save();
};

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  try {
    // Only hash the password if it's modified or new
    if (!this.isModified('password')) {
      console.log('Password not modified, skipping hash for', this.email);
      return next();
    }
    
    console.log('=== PASSWORD HASHING IN PRE-SAVE HOOK ===');
    console.log('User email:', this.email);
    console.log('Original password length:', this.password ? this.password.length : 0);
    
    // Always use a cost factor of 10 for consistent hashing
    const salt = await bcrypt.genSalt(10);
    console.log('Salt generated:', salt);
    
    // Check if the password is already hashed (starts with $2a$)
    if (this.password.startsWith('$2a$')) {
      console.log('Password appears to be already hashed, skipping hash operation');
      return next();
    }
    
    const hashedPassword = await bcrypt.hash(this.password, salt);
    console.log('Password hashed successfully');
    console.log('Hash length:', hashedPassword.length);
    console.log('Hash prefix:', hashedPassword.substring(0, 10) + '...');
    
    // Explicitly set the password to the hashed version
    this.password = hashedPassword;
    
    next();
  } catch (error) {
    console.error('Error in password hashing:', error);
    next(error);
  }
});

// Pre-save middleware to set default permissions based on role
userSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    switch (this.role) {
      case 'admin':
        this.permissions = [
          'view_menu', 'edit_menu', 
          'view_orders', 'manage_orders', 
          'view_users', 'manage_users',
          'view_tables', 'manage_tables',
          'view_bookings', 'manage_bookings',
          'view_inventory', 'manage_inventory',
          'view_reports', 'manage_reports',
          'view_promotions', 'manage_promotions',
          'view_feedback', 'manage_feedback',
          'manage_settings'
        ];
        break;
      case 'manager':
        this.permissions = [
          'view_menu', 'edit_menu', 
          'view_orders', 'manage_orders', 
          'view_users',
          'view_tables', 'manage_tables',
          'view_bookings', 'manage_bookings',
          'view_inventory', 'manage_inventory',
          'view_reports',
          'view_promotions', 'manage_promotions',
          'view_feedback', 'manage_feedback'
        ];
        break;
      case 'staff':
        this.permissions = [
          'view_menu',
          'view_orders', 'manage_orders',
          'view_tables',
          'view_bookings', 'manage_bookings',
          'view_inventory'
        ];
        break;
      case 'customer':
        this.permissions = ['view_menu'];
        break;
    }
  }
  next();
});

// Indexes for faster queries
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'preferences.favoriteItems': 1 });
userSchema.index({ loyaltyPoints: -1 });

// Create a model from our schema
const userModel = mongoose.model('User', userSchema);

// Export the model
export { userModel };

// Also export as default for flexibility
export default userModel;
