// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID, APPID, UNIONID } = cloud.getWXContext()
  
  try {
    // 查找或创建用户
    const userCollection = db.collection('users')
    let user = await userCollection.where({
      openid: OPENID
    }).get()

    if (user.data.length === 0) {
      // 创建新用户
      const now = new Date()
      const newUser = {
        openid: OPENID,
        unionid: UNIONID,
        nickname: '用户' + Math.random().toString(36).substr(2, 6),
        avatar: '',
        createdAt: now,
        updatedAt: now
      }

      const result = await userCollection.add({
        data: newUser
      })

      user = {
        _id: result._id,
        ...newUser
      }
    } else {
      user = user.data[0]
      
      // 更新最后登录时间
      await userCollection.doc(user._id).update({
        data: {
          updatedAt: new Date()
        }
      })
    }

    return {
      success: true,
      data: user,
      message: '登录成功'
    }
  } catch (error) {
    console.error('登录失败:', error)
    return {
      success: false,
      message: '登录失败',
      error: error.message
    }
  }
}