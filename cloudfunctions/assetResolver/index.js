const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  try {
    const { action, payload } = event || {}

    switch (action) {
      case 'resolveVideo':
        return resolveVideo(payload)
      default:
        return {
          success: false,
          message: 'Unknown action'
        }
    }
  } catch (error) {
    console.error('[assetResolver] error:', error)
    return {
      success: false,
      message: error && error.message ? error.message : 'Internal error'
    }
  }
}

function resolveVideo(payload) {
  if (!payload || !payload.avatarId || !payload.avatarRole || !payload.currentState) {
    return { success: false, message: 'Invalid payload' }
  }

  const assetKey = `${payload.avatarRole}_${payload.currentState}`

  return {
    success: true,
    data: {
      videoFileId: `placeholder://videos/${assetKey}.mp4`,
      posterFileId: `placeholder://posters/${assetKey}.jpg`,
      assetKey,
      assetSource: 'placeholder_v1',
      durationSeconds: 5
    }
  }
}
