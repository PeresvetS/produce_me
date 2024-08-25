// src/services/management/src/dataManagementService.js

const prisma = require('../../../db/prisma');
const logger = require('../../../utils/logger');

async function checkUserByID(userId) {
  const user = await prisma.user.findUnique({
    where: { userId: userId.toString() }
  });
  return user;
}

async function checkUserByUsername(username) {
  const user = await prisma.user.findUnique({
    where: { username: username }
  });
  return user;
}

async function checkUser(userId, username) {
  logger.info(`Checking user: ${username}`);
  const user = await checkUserByUsername(username);
  if (user === null) {
    return false;
  }
  const currentUserId = user.userId;
  if (currentUserId.startsWith('temp')) {
    await updateUserID(userId, username);
  }
  return user;
}

async function createUserByUsername(username) {
  logger.info(`Creating new user: ${username}`);

  try {
    await prisma.user.create({
      data: {
        userId: `temp_${Date.now()}`, // Temporary userId, should be updated later
        username: username,
        messageCount: 0,
        newDialogCount: 0
      }
    });
    logger.info(`User created with username: ${username}`);
  } catch (error) {
    if (error.code === 'P2002') {
      logger.info(`User already exists with username: ${username}`);
    } else {
      logger.error('Error creating user:', error);
      throw error;
    }
  }
}

async function updateUserID(userId, username) {
  logger.info(`Updating user ID: ${userId}`);
  try {
    await prisma.user.update({
      where: { username: username },
      data: { userId: userId.toString() }
    });
    logger.info(`User ID updated: ${userId}`);
  } catch (error) {
    logger.error('Error updating user ID:', error);
    throw error;
  }
}

async function checkOrCreateUser(userId, username) {
  logger.info(`Checking or creating user: ${userId}`);
  try {
    let user = await checkUser(userId, username);
    if (!user) {
      user = await createUser(userId, username);
      logger.info(`Created new user: ${userId}`);
    } else {
      logger.info(`User already exists: ${userId}`);
    }
    return user;
  } catch (error) {
    logger.error('Error in checkOrCreateUser:', error);
    throw error;
  }
}

async function checkOrCreateUserByUsername(username) {
  logger.info(`Checking or creating user: ${username}`);

  try {
    let user = await checkUserByUsername(username);

    if (!user) {
      user = await createUserByUsername(username);
      return false;
    }

    logger.info(`Created new user with username: ${username}`);

    return user;
  } catch (error) {
    logger.error('Error in checkOrCreateUserByUsername:', error);
    throw error;
  }
}

async function createUser(userId, username) {
  try {
    await prisma.user.create({
      data: {
        userId: userId.toString(),
        username: username,
        userData: {}
      }
    });
    logger.info(`User created: ${userId}`);
  } catch (error) {
    if (error.code === 'P2002') {
      logger.info(`User already exists: ${userId}`);
    } else {
      logger.error('Error creating user:', error);
      throw error;
    }
  }
}

async function updateUserData(userId, data) {
  try {
    const user = await prisma.user.findUnique({ where: { userId: userId.toString() } });
    const updatedUserData = { ...user.userData, ...data };
    await prisma.user.update({
      where: { userId: userId.toString() },
      data: { userData: updatedUserData }
    });
    logger.info(`User data updated: ${userId}`);
  } catch (error) {
    logger.error('Error updating user data:', error);
    throw error;
  }
}

async function getUserData(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: userId.toString() },
      select: { userData: true }
    });
    return user?.userData || {};
  } catch (error) {
    logger.error('Error getting user data:', error);
    throw error;
  }
}

async function getAllUsers(limit = 10, offset = 0) {
  try {
    const users = await prisma.user.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
    return users;
  } catch (error) {
    logger.error('Error listing users:', error);
    throw error;
  }
}

async function getUserInfo(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: userId.toString() }
    });
    return user;
  } catch (error) {
    logger.error('Error getting user info:', error);
    throw error;
  }
}

async function getStats() {
  try {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: {
        subscriptionEnd: {
          gt: new Date()
        }
      }
    });
    const totalDialogs = await prisma.user.aggregate({
      _sum: {
        messageCount: true
      }
    });
    return {
      totalUsers,
      activeUsers,
      totalDialogs: totalDialogs._sum.messageCount || 0
    };
  } catch (error) {
    logger.error('Error getting stats:', error);
    throw error;
  }
}

module.exports = {
  checkUserByID,
  checkUserByUsername,
  checkUser,
  createUserByUsername,
  updateUserID,
  checkOrCreateUser,
  checkOrCreateUserByUsername,
  createUser,
  updateUserData,
  getUserData,
  getAllUsers,
  getUserInfo,
  getStats,
};
