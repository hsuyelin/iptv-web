/** Languages the console is translated into. */
export const LOCALES = ['zh-CN', 'zh-TW', 'en'] as const
export type Locale = (typeof LOCALES)[number]

/** Each language written in itself, for accessible names. */
export const LOCALE_NAME: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  en: 'English',
}

/** Short form for the compact switcher. */
export const LOCALE_SHORT: Record<Locale, string> = {
  'zh-CN': '简',
  'zh-TW': '繁',
  en: 'EN',
}

const en = {
  'app.title': 'IPTV',
  'app.loadingChannels': 'Loading channels…',
  'app.channelsFailed': 'Cannot load the channel list. {detail}',
  'app.tryAgain': 'Try again',

  'nav.language': 'Language',
  'nav.senior': 'Senior mode',
  'nav.seniorGlyph': 'Aa',
  'nav.main': 'Main',
  'nav.channels': 'Channels',
  'nav.dashboard': 'Dashboard',

  'status.online': 'Online',
  'status.offline': 'Offline',
  'status.offlineSince': 'Offline, last seen {time}',
  'status.checking': 'Checking',

  'stats.title': 'Relay status',
  'stats.figures': 'Relay figures',
  'stats.channels': 'Channels',
  'stats.playlists': 'Playlists served',
  'stats.segments': 'Segments streamed',
  'stats.errors': 'Segment errors',
  'stats.upstream': 'Upstream calls',
  'stats.reloadError':
    'The channel file has an error, so the relay is serving its last good list.',

  'wall.other': 'Other',

  'wall.label': 'Channels',
  'wall.scrollBack': 'Scroll {group} back',
  'wall.scrollForward': 'Scroll {group} forward',

  'dashboard.title': 'Relay dashboard',
  'dashboard.updated': 'Last update',
  'dashboard.uptime': 'Uptime',
  'dashboard.file': 'Channel file',
  'dashboard.unknown': 'Unknown',
  'dashboard.waiting': 'Waiting for the first reading…',
  'dashboard.traffic': 'Segments streamed',
  'dashboard.trafficHint': 'New segments per {seconds} s, last {count} readings',
  'dashboard.trafficEmpty': 'Collecting readings…',
  'dashboard.attention': 'Needs attention',
  'dashboard.allClear': 'Nothing needs attention.',
  'dashboard.unavailable': 'Showing the notice stream instead of the channel:',
  'dashboard.errorRate': 'Segment error rate',
  'stats.requests': 'Segment requests',
  'stats.rejected': 'Segments rejected',
  'stats.queued': 'Upstream queue',


  'player.label': 'Player',
  'player.floatBack': 'Back to the player',
  'player.floatClose': 'Close the floating window',
  'player.floating': 'Floating player',
  'player.playlist': 'Playlist',
  'player.playlistClose': 'Close the playlist',

  'player.emptyTitle': 'Nothing on air',
  'player.emptyText': 'Pick a channel below to start watching.',
  'player.start': 'Start watching',
  'player.loadingVeil': 'Loading the stream…',
  'player.bufferingVeil': 'Buffering…',
  'player.failedDetail': 'Playback failed. {detail}',
  'player.retry': 'Retry',
  'player.liveStream': '{name} live stream',
  'player.unavailableNotice':
    'This channel is temporarily unavailable. The relay is showing its notice stream and will try the channel again shortly.',
} as const

/** Every message key; the other languages must provide all of them. */
export type MessageKey = keyof typeof en
export type Messages = Record<MessageKey, string>

const zhCN: Messages = {
  'app.title': 'IPTV',
  'app.loadingChannels': '正在加载频道…',
  'app.channelsFailed': '无法加载频道列表。{detail}',
  'app.tryAgain': '重试',

  'nav.language': '语言',
  'nav.senior': '长辈模式',
  'nav.seniorGlyph': '大',
  'nav.main': '主导航',
  'nav.channels': '频道',
  'nav.dashboard': '仪表盘',

  'status.online': '在线',
  'status.offline': '离线',
  'status.offlineSince': '离线，上次在线 {time}',
  'status.checking': '检测中',

  'stats.title': '中继状态',
  'stats.figures': '中继数据',
  'stats.channels': '频道',
  'stats.playlists': '已提供播放列表',
  'stats.segments': '已转发分片',
  'stats.errors': '分片错误',
  'stats.upstream': '上游调用',
  'stats.reloadError': '频道文件有错误，中继正在使用上一份有效的列表。',

  'wall.other': '其他',

  'wall.label': '频道',
  'wall.scrollBack': '向前滚动 {group}',
  'wall.scrollForward': '向后滚动 {group}',

  'dashboard.title': '中继仪表盘',
  'dashboard.updated': '最近更新',
  'dashboard.uptime': '已运行',
  'dashboard.file': '频道文件',
  'dashboard.unknown': '未知',
  'dashboard.waiting': '正在等待第一次读数…',
  'dashboard.traffic': '已转发分片',
  'dashboard.trafficHint': '每 {seconds} 秒新增分片数，最近 {count} 次读数',
  'dashboard.trafficEmpty': '正在收集读数…',
  'dashboard.attention': '需要关注',
  'dashboard.allClear': '一切正常。',
  'dashboard.unavailable': '正在播放提示流而不是频道：',
  'dashboard.errorRate': '分片错误率',
  'stats.requests': '分片请求',
  'stats.rejected': '被拒绝的分片',
  'stats.queued': '上游排队',


  'player.label': '播放器',
  'player.floatBack': '回到播放器',
  'player.floatClose': '关闭悬浮窗',
  'player.floating': '悬浮播放器',
  'player.playlist': '播放列表',
  'player.playlistClose': '关闭播放列表',

  'player.emptyTitle': '当前没有播放',
  'player.emptyText': '从下方选择一个频道开始观看。',
  'player.start': '开始观看',
  'player.loadingVeil': '正在加载直播流…',
  'player.bufferingVeil': '缓冲中…',
  'player.failedDetail': '播放失败。{detail}',
  'player.retry': '重试',
  'player.liveStream': '{name} 直播',
  'player.unavailableNotice':
    '该频道暂时不可用。中继正在播放提示流，稍后会再次尝试该频道。',
}

const zhTW: Messages = {
  'app.title': 'IPTV',
  'app.loadingChannels': '正在載入頻道…',
  'app.channelsFailed': '無法載入頻道清單。{detail}',
  'app.tryAgain': '重試',

  'nav.language': '語言',
  'nav.senior': '長輩模式',
  'nav.seniorGlyph': '大',
  'nav.main': '主導覽',
  'nav.channels': '頻道',
  'nav.dashboard': '儀表板',

  'status.online': '在線',
  'status.offline': '離線',
  'status.offlineSince': '離線，上次在線 {time}',
  'status.checking': '檢測中',

  'stats.title': '中繼狀態',
  'stats.figures': '中繼資料',
  'stats.channels': '頻道',
  'stats.playlists': '已提供播放清單',
  'stats.segments': '已轉發分片',
  'stats.errors': '分片錯誤',
  'stats.upstream': '上游呼叫',
  'stats.reloadError': '頻道檔案有錯誤，中繼正在使用上一份有效的清單。',

  'wall.other': '其他',

  'wall.label': '頻道',
  'wall.scrollBack': '向前捲動 {group}',
  'wall.scrollForward': '向後捲動 {group}',

  'dashboard.title': '中繼儀表板',
  'dashboard.updated': '最近更新',
  'dashboard.uptime': '已運行',
  'dashboard.file': '頻道檔案',
  'dashboard.unknown': '未知',
  'dashboard.waiting': '正在等待第一次讀數…',
  'dashboard.traffic': '已轉發分片',
  'dashboard.trafficHint': '每 {seconds} 秒新增分片數，最近 {count} 次讀數',
  'dashboard.trafficEmpty': '正在收集讀數…',
  'dashboard.attention': '需要關注',
  'dashboard.allClear': '一切正常。',
  'dashboard.unavailable': '正在播放提示串流而不是頻道：',
  'dashboard.errorRate': '分片錯誤率',
  'stats.requests': '分片請求',
  'stats.rejected': '被拒絕的分片',
  'stats.queued': '上游排隊',


  'player.label': '播放器',
  'player.floatBack': '回到播放器',
  'player.floatClose': '關閉懸浮視窗',
  'player.floating': '懸浮播放器',
  'player.playlist': '播放清單',
  'player.playlistClose': '關閉播放清單',
  'player.emptyTitle': '目前沒有播放',
  'player.emptyText': '從下方選擇一個頻道開始觀看。',
  'player.start': '開始觀看',
  'player.loadingVeil': '正在載入直播串流…',
  'player.bufferingVeil': '緩衝中…',
  'player.failedDetail': '播放失敗。{detail}',
  'player.retry': '重試',
  'player.liveStream': '{name} 直播',
  'player.unavailableNotice':
    '此頻道暫時無法使用。中繼正在播放提示串流，稍後會再次嘗試此頻道。',
}

export const MESSAGES: Record<Locale, Messages> = { en, 'zh-CN': zhCN, 'zh-TW': zhTW }
