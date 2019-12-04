const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  sex: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  rank: {
    type: String,
    required: true
  },
  startdate: {
    type: Date,
    // required: true,
    default: Date.now
  },
  avatar: {
    type: String,
    default: '../../public/avatar/default.png'
  },
  superiorname: {
    type: String
  },
  superior: {
    type: Schema.Types.ObjectId
  },
  subordinates: [Schema.Types.ObjectId],
  Timestamp: {
    type: String
  }
});


UserSchema.plugin(mongoosePaginate);

const User = mongoose.model('usarmy_userlist', UserSchema);

const getAllUsers = async () => {
  let flow = User.find({});
  return await flow.catch(err => {
    console.log(err);
    throw new Error('error getting users from db');
  });
};

const getUsers = async params => {
  const { pageSize, pageNumber, sortType, searchText, superiorId } = params;
  let regex = new RegExp(searchText, 'gim');
  let query = {
    $or: [
      { name: regex },
      { rank: regex },
      { sex: regex },
      { phone: regex },
      { email: regex },
      { superiorname: regex }
    ]
  };
  if (superiorId) {
    query = {
      ...query,
      $and: [{ superior: superiorId }]
    };
  }

  const sortOrder = [
    { Timestamp: -1}, // 0
    { name: 1 }, // 1
    { name: -1 }, // 2
    { sex: 1 }, // 3
    { sex: -1 }, // 4
    { rank: 1 }, // 5
    { rank: -1 }, // 6
    { startdate: 1 }, // 7
    { startdate: -1 }, // 8
    { phone: 1 }, // 9
    { phone: -1 }, // 10
    { email: 1 }, // 11
    { email: -1 }, // 12
    { superiorname: 1 }, // 13
    { superiorname: -1 } // 14
  ];
  const options = {
    sort: sortOrder[sortType],
    lean: true, // return JSON not doc
    page: pageNumber,
    limit: pageSize
  };
  let flow = User.paginate(query, options);

  return await flow.catch(err => {
    console.log(err);
    throw new Error('error getting users from db');
  });
};

const getUserById = async userId => {
  return await User.findOne({ _id: userId }).catch(err => {
    console.log(err);
    throw new Error(`error getting user by id: ${userId}`);
  });
};

const createUser = async userData => {
  const today = new Date();
  const date = today.getFullYear()+''+(today.getMonth()+1)+''+today.getDate();
  const time = today.getHours() + '' + today.getMinutes() + '' + today.getSeconds();
  const dateTime = date+''+time;
  console.log(dateTime);
  const newUser = new User({
    name: userData.name,
    rank: userData.rank,
    sex: userData.sex,
    startdate: userData.startdate,
    phone: userData.phone,
    email: userData.email,
    avatar: userData.avatar,
    superior: userData.superior,
    superiorname: userData.superiorname,
    Timestamp: dateTime
  });
  return await newUser.save().catch(err => {
    console.log(err);
    throw new Error('error creating user');
  });
};

const addUserSubordinates = async (userId, dsId) => {
  return await User.findOneAndUpdate(
    { _id: userId },
    { $addToSet: { subordinates: dsId } },
    { new: true }
  ).catch(err => {
    console.log(err);
    throw new Error('error adding user subordinates');
  });
};

const transferUserSubordinates = async (userId, ds) => {
  return await User.findOneAndUpdate(
    { _id: userId },
    {
      $push: {
        subordinates: {
          $each: [...ds]
          // $position: 0
        }
      }
    },
    { new: true }
  ).catch(err => {
    console.log(err);
    throw new Error('error transfering user subordinates');
  });
};

const deleteUserSubordinates = async (userId, dsId) => {
  return await User.findOneAndUpdate(
    { _id: userId },
    {
      $pull: {
        subordinates: dsId
      }
    },
    { new: true }
  ).catch(err => {
    console.log(err);
    throw new Error('error deleting user subordinates');
  });
};

const deleteUserSuperior = async supId => {
  return await User.updateMany(
    { superior: supId },
    { $set: { superior: null, superiorname: null } },
    { new: true }
  ).catch(err => {
    console.log(err);
    throw new Error('error deleting user superior');
  });
};

const deleteUserById = async userId => {
  return await User.findByIdAndDelete({ _id: userId }).catch(err => {
    console.log(err);
    throw new Error(`error deleting user by id: ${userId}`);
  });
};

const updateUserById = async (userId, userData) => {
  if (userData.superior === '' || userData.superiorname === '') {
    userData.superior = null;
    userData.superiorname = null;
  }
  return await User.findOneAndUpdate(
    { _id: userId },
    {
      $set: {
        name: userData.name,
        rank: userData.rank,
        sex: userData.sex,
        startdate: userData.startdate,
        phone: userData.phone,
        email: userData.email,
        avatar: userData.avatar,
        superior: userData.superior,
        superiorname: userData.superiorname
      }
    },
    { new: true }
  ).catch(err => {
    console.log(err);
    throw new Error(`error updating user by id: ${userId}`);
  });
};

const updateUserSuperior = async (supId, newSupId, newSupName) => {
  return await User.updateMany(
    { superior: supId },
    { $set: { superior: newSupId, superiorname: newSupName } },
    { new: true }
  ).catch(err => {
    console.log(err);
    throw new Error('error updating user superior');
  });
};

const getSubordinates = async userId => {
  try {
    let rs = await getUserById(userId);
    let rsArr = rs.subordinates;
    if (rs.subordinates.length === 0) return [];
    for (let i = 0; i < rs.length; i++) {
      let ds = await getSubordinates(rs[i]);
      let dsArr = ds.subordinates;
      rsArr = [...rsArr, ...dsArr];
    }
    return rsArr;
  } catch (err) {
    console.log(err);
    throw new Error('error geting user subordinates');
  }
};

module.exports = {
  model: User,
  getUsers,
  getUserById,
  createUser,
  addUserSubordinates,
  deleteUserSubordinates,
  deleteUserSuperior,
  deleteUserById,
  transferUserSubordinates,
  updateUserById,
  updateUserSuperior,
  getAllUsers,
  getSubordinates
};
