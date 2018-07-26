var express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const passport = require('passport');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({storage: storage});
const path = require('path');
const {JWT_SECRET} = require('../config');
const CouponModel = require('../models/Coupon');
var router = express.Router();
const jsonParser = bodyParser.json();
const jwtAuth = passport.authenticate('jwt', { session: false });

function capitalizeFirstLetterOfEveryWord(str){
  var splitStr = str.toLowerCase().split(' ');
   for (var i = 0; i < splitStr.length; i++) {
       // You do not need to check if i is larger than splitStr length, as your for does that for you
       // Assign it back to the array
       splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
   }
   // Directly return the joined string
   return splitStr.join(' ');
}

function formatMerchantName(string){
  string.toLowerCase();
  console.log(string.toLowerCase());
  const newstring = string.toLowerCase();
  return capitalizeFirstLetterOfEveryWord(newstring);
}

//GETS THE USERID FROM JWT - returns the userid from a request 'authorization' header
function getUserIdFromJwt(req){
  const token = req.headers.authorization.split(' ')[1];
	const tokenPayload = jwt.verify(token, JWT_SECRET);
	const userId = tokenPayload.user.userId;
  return userId;
}

// GETS ALL COUPONS
router.get('/', jwtAuth, (req, res) => {
  const _userId = getUserIdFromJwt(req);
  CouponModel.find({userId: _userId})
    .then(coupons => res.status(200).json({coupons, _userId}))
    .catch(err => {
        console.error(err);
        res.status(500).json({
          message: 'Internal server error'
        });
    });
});

// GETS SPECIFIC COUPON
router.get('/:id', jwtAuth, (req, res) => {
  const _userId = getUserIdFromJwt(req);
  CouponModel.findById(req.params.id)
    .then(coupons => res.status(200).json(coupons))
    .catch(err => {
        console.error(err);
        res.status(500).json({
          message: 'Internal server error'
        });
    });
});

// CREATES A NEW COUPON
router.post('/', jwtAuth, upload.single('couponImage'), (req, res) => {
  //console.log(req.file);
  const _userId = getUserIdFromJwt(req);
  //console.log('************* Merchant Name: ' + formatMerchantName(req.body.merchantName) + '*****************');

  const newCoupon = new CouponModel({
    merchantName: formatMerchantName(req.body.merchantName),
    code: req.body.code,
    expirationDate: req.body.expirationDate,
    description: req.body.description,
    couponUsed: false,
    companyLogo: req.body.companyLogo,
    couponImage: req.file.path,
    userId: _userId
  });

  newCoupon.save()
      .then(function(coupon) {
        const savedCoupon = coupon.toObject();
        console.log(savedCoupon);
        res.status(201).json(savedCoupon);
      })
      .catch(function(err) {
        console.error(err);
        res.status(500).send(err);
      });
});

// DELETES A NEW COUPON
router.delete('/:id', jwtAuth, (req, res) => {
  //console.log(req);
  CouponModel.findByIdAndRemove(req.params.id)
  .then(coupon => res.status(204).end())
  .catch(err => res.status(500).json({message: 'Internal server error'}));
});

// EDITS A NEW COUPON
router.put('/:id', jwtAuth, (req, res) => {
  console.log(`req.params.id:  ${req.params.id}`);
  console.log(`req.body.id: ${req.body.id}`);

  console.log('************** User Edited **************');
  Object.keys(req.body)
  .forEach(function eachKey(key) {
    console.log(key+ ' : '+ req.body[key]); // alerts key and value
    if(key === 'merchantName'){
      req.body[key] = formatMerchantName(req.body[key]);
      console.log('** Formatted Merchant Name  ' + req.body[key] + '  **');
    }
  });
  console.log('************** End of User Edited **************\n');

  // if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
  //   res.status(400).json({
  //     error: 'Request path id and request body id values must match'
  //   });
  // }

  const updated = {};
  const updateableFields = ['merchantName', 'code', 'expirationDate', 'description'];

  console.log('************** Updated Fields **************');
  updateableFields.forEach(field => {
    if(field in req.body) {
      updated[field] = req.body[field];
      console.log(field +' : ' + updated[field]);
    }
  });
  console.log('************** End of Updated Fields **************\n');

  CouponModel.findByIdAndUpdate(req.params.id, {$set: updated }, { new: true})
  .then(updatedCoupon => res.status(204).end())
  .catch(err => res.status(500).json({ message: 'Something went wrong'}));

});

// UPDATES ONLY ITEMS PROVIDED OF AN IMAGE OF COUPON
router.patch('/:id', jwtAuth, upload.single('couponImage'), (req, res) => {
  const updateOps = {};
  const updateableFields = ['merchantName', 'code', 'expirationDate', 'description','couponImage', 'couponUsed'];

  updateableFields.forEach(field => {
    if(field in req.body) {
      updateOps[field] = req.body[field];
    }
  });

  console.log(CouponModel.findByIdAndUpdate(req.params.id, {$set: updateOps },{ new: true }));

  CouponModel.findByIdAndUpdate(req.params.id, {$set: updateOps },{ new: true })
  .then(coupon => {
    res.status(200).json({
      coupon: coupon
    });
  })
  .catch(err => {
    console.log(err);
    res.status(500).json({
      error: err
    });
  });

});

module.exports = router;
