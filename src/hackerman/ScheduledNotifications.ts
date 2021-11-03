let Notifications: any = null

if (process.env.MODE === 'capacitor') {
  // @ts-ignore
  import('@capacitor/local-notifications').then(
    ({ LocalNotifications }) => {
      Notifications = LocalNotifications
    }
  )
}

// new Date(Date.now() + 1000 * 5)
export function scheduleNotification(options: any) {
  if (process.env.MODE === 'capacitor') {
    // createTasksChannel()
    Notifications.schedule({
      notifications: [
        {
          id: options.id,
          title: options.title,
          body: options.body,
          schedule: { at: options.schedule_at },
          group: 'tasks',
          // channelId: 'tdl-app-tasks',
          // sound: 'tuturu.wav',
          // smallIcon: 'ic_stat_icon_config_sample',
          // iconColor: '#FF00FF',
        },
      ],
    });
  } else {
    console.log('The web version of TDL App does not support scheduled notifications.')
  }
}

export function cancelNotification(options: any) {
  console.log(options)
}

// const createTasksChannel = (
//  () => {
//   let executed = false
//   return () => {
//     if (!executed) {
//       executed = true
//       const newChannel = LocalNotifications.createChannel({
//         id: 'tdl-app-tasks',
//         name: 'TDL App Tasks',
//         description: 'Tasks from TDL App',
//         sound: null,
//         vibration: false
//       })
//       console.log(newChannel)
//     }
//   }
//  }
// )()

// export function createTasksChannel() {
//   if (process.env.MODE === 'capacitor') {
//     const newChannel = Notifications.createChannel({
//       id: 'tdl-app-tasks',
//       name: 'TDL App Tasks',
//       description: 'Tasks from TDL App',
//       sound: 'tuturu.wav',
//       importance: 3,
//       vibration: false
//     })
//     console.log(newChannel)
//   }
// }
