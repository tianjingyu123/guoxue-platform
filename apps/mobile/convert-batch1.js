/**
 * Batch 1 Scoped -> Tailwind Vue3 Converter
 *
 * Coverage is everything - FOCUS MODE
 * Run: node convert-batch1.js
 */

const fs = require('fs')
const path = require('path')

const BATCH_FILE = path.resolve(__dirname, '_scoped_batch1.txt')
const V0_ROOT = path.resolve('C:/Users/Administrator/Desktop/V0前端设计6.9日版/app')
const MOBILE_PAGES = path.resolve(__dirname, 'src/pages')
const BACKUP_DIR = path.resolve(__dirname, '.backup')

// ==================== ICON MAP ====================
const ICONS = {
  'ArrowLeft':'←','Search':'🔍','ChevronRight':'›','ChevronDown':'⌄','ChevronUp':'⌃','ChevronLeft':'‹',
  'Star':'⭐','Heart':'❤️','Share':'📤','Share2':'📤','Bell':'🔔','Settings':'⚙️','Settings2':'⚙⚙',
  'User':'👤','Users':'👥','UserPlus':'👤+','UserCheck':'👤✓','UserX':'👤✕','UserMinus':'👤−',
  'Calendar':'📅','Clock':'🕐','MapPin':'📍','Check':'✓','CheckCircle':'✅','X':'✕','XCircle':'❌',
  'Plus':'+','Minus':'−','Edit2':'✏️','Edit':'✏️','Trash2':'🗑','Trash':'🗑','Lock':'🔒','LockOpen':'🔓',
  'Eye':'👁','EyeOff':'👁🚫','Filter':'🔽','BookOpen':'📖','Book':'📖','Play':'▶','Camera':'📷',
  'Send':'📨','Info':'ℹ️','AlertTriangle':'⚠️','AlertCircle':'⚠️','Download':'⬇','Upload':'⬆',
  'Gift':'🎁','Wallet':'👛','CreditCard':'💳','MessageCircle':'💬','MessageSquare':'💬',
  'FileText':'📄','TrendingUp':'📈','TrendingDown':'📉','ShoppingCart':'🛒','Package':'📦',
  'Truck':'🚚','Phone':'📞','Mail':'✉️','Mic':'🎤','MicOff':'🎤🚫','DollarSign':'💰',
  'BarChart3':'📊','Crown':'👑','Flag':'🚩','Pin':'📌','Megaphone':'📢','Image':'🖼','Hash':'#',
  'AtSign':'@','Link':'🔗','Music':'🎵','Headphones':'🎧','Tv':'📺','Video':'🎬','Radio':'📡',
  'Monitor':'🖥','ExternalLink':'🔗','RefreshCw':'🔄','History':'📋','List':'☰','Grid3X3':'⊞',
  'Tag':'🏷','Percent':'%','BadgePercent':'🏷','Home':'🏠','Menu':'☰','Sun':'☀️','Moon':'🌙',
  'ArrowRight':'→','ArrowUp':'↑','ArrowDown':'↓','Copy':'📋','Building2':'🏢','Award':'🏆',
  'Briefcase':'💼','Globe':'🌐','HelpCircle':'❓','LogOut':'🚪','Shield':'🛡','MoreHorizontal':'⋯',
  'MoreVertical':'⋮','Compass':'🧭','GraduationCap':'🎓','Zap':'⚡','SearchX':'🔍✕',
  'MessageSquarePlus':'💬+','MessageSquareText':'💬📝','MessageCirclePlus':'💬+',
  'ThumbsUp':'👍','ThumbsDown':'👎','Ban':'🚫','Info':'ℹ️','Sparkles':'✨',
  'ShoppingBag':'🛍','StarHalf':'⭐½','StarOff':'⭐🚫','RefreshCcw':'🔄',
  'Repeat':'🔄','Reply':'↩','Save':'💾','Printer':'🖨','QrCode':'📱',
  'SlidersHorizontal':'🎚','SlidersVertical':'🎚','Smile':'😊','SmilePlus':'😊+','Frown':'😢',
  'ScrollText':'📜','Timer':'⏱','AlarmClock':'⏰','Bookmark':'🔖','Box':'📦',
  'Clipboard':'📋','Coffee':'☕','Navigation':'🧭','Navigation2':'🧭',
  'Pen':'🖊','Pencil':'✏️','PenTool':'🖊','PieChart':'📊','Plane':'✈️',
  'Smartphone':'📱','Speaker':'🔊','Volume':'🔊','Volume1':'🔉','Volume2':'🔊','VolumeX':'🔇',
  'Trophy':'🏆','Target':'🎯','Terminal':'💻','Ticket':'🎫','UploadCloud':'⬆☁️',
  'DownloadCloud':'⬇☁️','Verified':'✅','Wifi':'📶','Wind':'🌬','Wrench':'🔧',
  'PhoneCall':'📞','PhoneForwarded':'📞→','PhoneIncoming':'📞⬇','PhoneMissed':'📞✕','PhoneOff':'📞🚫',
  'PhoneOutgoing':'📞⬆','Map':'🗺','MapPinned':'📍📌',
  'ImageMinus':'🖼−','ImagePlus':'🖼+','ImageOff':'🖼🚫','Images':'🖼🖼',
  'BookmarkCheck':'🔖✓','BookmarkMinus':'🔖−','BookmarkPlus':'🔖+','BookmarkX':'🔖✕',
  'Bot':'🤖','BotMessageSquare':'🤖💬','Brain':'🧠','Bug':'🐛',
  'CalendarCheck':'📅✓','CalendarDays':'📅📅','CalendarHeart':'📅❤','CalendarMinus':'📅−',
  'CalendarPlus':'📅+','CalendarX':'📅✕','Cigarette':'🚬','CigaretteOff':'🚬🚫',
  'CircleCheck':'✓○','CircleChevronRight':'›○',
  'Code':'</>','Cog':'⚙','Command':'⌘','Cpu':'💾',
  'Database':'🗄','Delete':'⌫','Disc':'💿','Divide':'÷',
  'Droplet':'💧','Droplets':'💧💧','Dumbbell':'🏋','Earth':'🌍',
  'Egg':'🥚','Equal':'=','Eraser':'🧹','Euro':'€','Expand':'⛶',
  'FastForward':'⏩','Feather':'🪶','Figma':'🖌','Film':'🎞',
  'Flame':'🔥','Flashlight':'🔦','Folder':'📁','FolderOpen':'📂','FolderPlus':'📁+',
  'ForkKnife':'🍴','Forward':'⏩','Framer':'🔷','Fuel':'⛽',
  'Gamepad2':'🎮','Gamepad':'🎮','Gauge':'📊','Gavel':'🔨',
  'Gem':'💎','Ghost':'👻','GitBranch':'⎇','GitCommit':'⎇○','GitMerge':'⎇→','GitPullRequest':'⎇□',
  'Github':'🐙','Gitlab':'🦊','GlobeLock':'🌐🔒',
  'Hammer':'🔨','Hand':'✋','HandCoins':'✋💰','HandHeart':'✋❤','Handshake':'🤝',
  'HardDrive':'💾','Headset':'🎧','Hexagon':'⬡','Highlighter':'🖍',
  'Hop':'🍀','Hospital':'🏥','Hourglass':'⏳','IceCream':'🍦',
  'Inbox':'📥','Infinity':'∞','Inspect':'🔍',
  'IterationCw':'↻','IterationCcw':'↺','Kanban':'☰','Key':'🔑',
  'Keyboard':'⌨️','Lamp':'💡','Landmark':'🏛','Languages':'🌐',
  'Laptop':'💻','LaptopMinimal':'💻','Lasso':'🤠','Laugh':'😄','Layers':'📚',
  'LayoutDashboard':'📊','LayoutList':'☰','LayoutTemplate':'⊞',
  'Leaf':'🍃','Library':'📚','Lightbulb':'💡','LightbulbOff':'💡🚫',
  'LineChart':'📈','Link2':'🔗','Linkedin':'🔗','Loader':'⏳','Loader2':'⏳',
  'LocateFixed':'📍','LocateOff':'📍🚫','LogIn':'🔑','Lollipop':'🍭',
  'Magnet':'🧲','MailCheck':'✉✓','MailOpen':'✉📂','MailPlus':'✉+','MailQuestion':'✉?',
  'MailSearch':'✉🔍','MailWarning':'✉⚠','MailX':'✉✕','Mailbox':'📪',
  'Martini':'🍸','Maximize':'⛶','Maximize2':'⛶','Medal':'🥇',
  'Meh':'😐','Menu':'☰',
  'MessageCircleReply':'💬↩','MessageCircleX':'💬✕',
  'MessageSquareDashed':'💬--','MessageSquareReply':'💬↩','MessageSquareX':'💬✕',
  'MessagesSquare':'💬💬','Microscope':'🔬','Microwave':'📟',
  'MoonStar':'🌙⭐','Mouse':'🖱','MousePointerClick':'🖱',
  'Network':'🔗','Newspaper':'📰','NotepadText':'📝','Notebook':'📓','NotebookText':'📓📝',
  'Nut':'🔩','Octagon':'⯃','OctagonX':'⯃✕','Omega':'Ω','Option':'⌥','Orbit':'🌍',
  'PaintBucket':'🪣','Paintbrush':'🖌','Palette':'🎨','Paperclip':'📎',
  'Pause':'⏸','PawPrint':'🐾','PcCase':'🖥','PenLine':'🖊_','PencilRuler':'✏️📐',
  'PersonStanding':'🧍','Pi':'π','Piano':'🎹','Pickaxe':'⛏',
  'PiggyBank':'🐷','Pill':'💊','PinOff':'📌🚫','Pipette':'🧪',
  'Pizza':'🍕','PlaneLanding':'✈🛬','PlaneTakeoff':'✈🛫','Plug':'🔌',
  'PlugZap':'🔌⚡','Pocket':'👖','PocketKnife':'🔪','Podcast':'🎙','Pointer':'🖱',
  'Popcorn':'🍿','Power':'⏻','Presentation':'📊','Projector':'📽','Puzzle':'🧩',
  'Quote':'💬','Radar':'📡','Radiation':'☢','RadioReceiver':'📻',
  'RadioTower':'📡','Rainbow':'🌈','Rat':'🐀','Receipt':'🧾','Rocket':'🚀',
  'Rss':'📡','Ruler':'📐','Sailboat':'⛵','Sandwich':'🥪','Satellite':'📡',
  'SatelliteDish':'📡','Scale':'⚖','Scan':'📷','ScanFace':'😊📷','ScanLine':'📷_',
  'School':'🏫','Scissors':'✂','ScreenShare':'📺','ScreenShareOff':'📺🚫',
  'Scroll':'📜','SearchCode':'🔍</>','Server':'🖥','ServerCrash':'🖥💥',
  'ShieldAlert':'🛡⚠','ShieldCheck':'🛡✓','ShieldOff':'🛡🚫',
  'ShieldQuestion':'🛡?','Shirt':'👕','ShoppingBasket':'🧺','Shovel':'🪓',
  'ShowerHead':'🚿','Shrink':'⛶','Shrub':'🌳','Shuffle':'🔀',
  'Sigma':'Σ','Signal':'📶','Signpost':'📍','Siren':'🚨',
  'SkipBack':'⏪','SkipForward':'⏩','Skull':'💀','Slack':'#',
  'Slash':'/','Slice':'🔪','SmartphoneCharging':'📱⚡','Snail':'🐌',
  'Snowflake':'❄','Sofa':'🛋','SortAsc':'⬆☰','SortDesc':'⬇☰',
  'Soup':'🍜','Spade':'♠','SpellCheck':'✓Aa','Spline':'📊',
  'Split':'⎇','Sprout':'🌱','Square':'□','SquareCheck':'☑','SquareFunction':'□f',
  'SquareMinus':'□−','SquarePlus':'□+','SquarePen':'□✏','SquareStack':'□□',
  'SquareX':'□✕','Squircle':'⬜','Stamp':'📮','StepBack':'⏪','StepForward':'⏩',
  'Stethoscope':'🩺','Sticker':'📋','StickyNote':'📝','StopCircle':'⏹○',
  'Store':'🏪','Strikethrough':'S̶','Subscript':'x₂','Subtitles':'📝',
  'Sunrise':'🌅','Sunset':'🌇',
  'SwitchCamera':'📷🔄','Sword':'⚔️',
  'Swords':'⚔⚔','Syringe':'💉','Table':'📊','Table2':'📊','TableProperties':'📊⚙',
  'Tablet':'📱','Tablets':'💊','Tags':'🏷🏷',
  'Telescope':'🔭','Tent':'⛺','TestTube':'🧪','TestTubes':'🧪🧪',
  'Text':'📝','TextCursor':'|','TextSelect':'📝','Theater':'🎭','Thermometer':'🌡',
  'TicketCheck':'🎫✓','TicketPercent':'🎫%','TicketPlus':'🎫+',
  'TicketSlash':'🎫/','TicketX':'🎫✕','Tickets':'🎫🎫','TimerReset':'⏱🔄',
  'ToggleLeft':'🔘','Tool':'🔧','Tornado':'🌪','Touchpad':'🖐',
  'TowerControl':'🗼','ToyBrick':'🧱','Tractor':'🚜','TrafficCone':'🛑',
  'TrainFront':'🚂','TreeDeciduous':'🌳','TreePalm':'🌴','TreePine':'🌲',
  'Trello':'📋','Triangle':'△','TriangleAlert':'⚠️','TriangleRight':'▶',
  'Turtle':'🐢','TvMinimal':'📺','TvMinimalPlay':'📺▶',
  'Twitch':'📺','Twitter':'🐦','Type':'T','Umbrella':'☂','UmbrellaOff':'☂🚫',
  'Underline':'＿','Undo2':'↩','UndoDot':'↩•','UnfoldHorizontal':'⛶↔',
  'UnfoldVertical':'⛶↕','Ungroup':'👥','Unlink':'🔗🚫','Unplug':'🔌',
  'UploadCloud':'⬆☁️','Usb':'🔌','UserCircle':'👤○','UserCog':'👤⚙','UserPen':'👤✏',
  'UserRound':'👤○','UserRoundCheck':'👤✓○','UserRoundPlus':'👤+○','UserRoundX':'👤✕○',
  'UserSearch':'👤🔍','UsersRound':'👥○','Utensils':'🍴','UtensilsCrossed':'🍴✝',
  'Variable':'x','Vegan':'🌱','VenetianMask':'🎭','VenusAndMars':'⚤',
  'Vibrate':'📳','VibrateOff':'📳🚫','VideoOff':'🎬🚫','Videotape':'📼',
  'View':'👁','Voicemail':'📧','Volleyball':'🏐','VolumeX':'🔇','Vote':'🗳',
  'WalletCards':'👛💳','WalletMinimal':'👛','Wallpaper':'🖼','Wand':'🪄',
  'WandSparkles':'🪄✨','Warehouse':'🏭','WashingMachine':'🧺','Watch':'⌚',
  'Waves':'🌊','Waypoints':'📍📍','Webcam':'📹','Webhook':'🔗',
  'Weight':'🏋','Wheat':'🌾','WheatOff':'🌾🚫','WholeWord':'Aa',
  'Wine':'🍷','WineOff':'🍷🚫','Workflow':'🔀','Worm':'🪱',
  'WrapText':'↩📝','Wrench':'🔧',
  'Youtube':'▶️','ZapOff':'⚡🚫','ZoomIn':'🔍+','ZoomOut':'🔍-',
  // Extra
  'Heater':'🔥','IceCreamBowl':'🍨','IceCreamCone':'🍦','IdCard':'🪪',
  'Import':'⬇','InspectionPanel':'📋','Joystick':'🕹',
  'LandPlot':'🏡','LeafyGreen':'🥬','LifeBuoy':'🛟',
  'LoaderCircle':'⏳○','LoaderPinwheel':'🌀',
  'Locate':'📍','Luggage':'🧳',
  'Mails':'✉✉','MemoryStick':'💾','Merge':'⎇',
  'MessageCircleCode':'💬</>','MessageCircleHeart':'💬❤','MessageCircleMore':'💬⋯',
  'MessageCircleOff':'💬🚫','MessageCircleQuestion':'💬?','MessageCircleWarning':'💬⚠',
  'MessageSquareCode':'💬</>','MessageSquareDot':'💬•','MessageSquareHeart':'💬❤',
  'MessageSquareMore':'💬⋯','MessageSquareOff':'💬🚫','MessageSquareShare':'💬📤',
  'MessageSquareWarning':'💬⚠','MicVocal':'🎤🎵','Microchip':'💾',
  'Milestone':'📍','Milk':'🥛','MilkOff':'🥛🚫',
  'MonitorCheck':'🖥✓','MonitorCog':'🖥⚙','MonitorDot':'🖥•','MonitorDown':'🖥⬇',
  'MonitorOff':'🖥🚫','MonitorPause':'🖥⏸','MonitorPlay':'🖥▶','MonitorSmartphone':'🖥📱',
  'MonitorSpeaker':'🖥🔊','MonitorStop':'🖥⏹','MonitorUp':'🖥⬆','MonitorX':'🖥✕',
  'Mountain':'⛰','MountainSnow':'🏔','MouseOff':'🖱🚫','Move':'↕↔','Move3d':'↕↔',
  'MoveDiagonal':'↖↗','MoveDown':'⬇','MoveHorizontal':'↔','MoveLeft':'⬅',
  'MoveRight':'➡','MoveUp':'⬆','MoveUpLeft':'↖','MoveUpRight':'↗','MoveVertical':'↕',
  'Movie':'🎬','Music2':'🎵','Music3':'🎵','Music4':'🎵',
  'NavigationOff':'🧭🚫','Nfc':'📱','NotebookPen':'📓✏','NotebookTabs':'📓📑',
  'NotepadTextDashed':'📝--','NutOff':'🔩🚫',
  'OctagonAlert':'⯃⚠','OctagonMinus':'⯃−','OctagonPause':'⯃⏸',
  'Origami':'🟦','Outdent':'←',
  'Package2':'📦','PackageCheck':'📦✓','PackageMinus':'📦−','PackageOpen':'📦📂',
  'PackagePlus':'📦+','PackageSearch':'📦🔍','PackageX':'📦✕','PackingList':'📋',
  'PaintRoller':'🎨','PaintbrushVertical':'🖌',
  'PanelBottom':'⊞','PanelBottomClose':'⊞',
  'PanelLeft':'⊞','PanelLeftClose':'⊞','PanelRight':'⊞','PanelRightClose':'⊞',
  'PanelTop':'⊞','PanelTopClose':'⊞',
  'PartyPopper':'🎉','PenOff':'🖊🚫','PencilLine':'✏_','PencilOff':'✏🚫',
  'Pentagon':'⬠','PhilippinePeso':'₱',
  'PictureInPicture':'🖼','PictureInPicture2':'🖼',
  'Pilcrow':'¶','Plug2':'🔌','PlugZap2':'🔌⚡',
  'PointerOff':'🖱🚫','Popsicle':'🍦','PowerCircle':'⏻○','PowerOff':'⏻🚫',
  'PowerSquare':'⏻□','Proportions':'☐',
  'QrCode':'📱',
  'Radius':'⌀','RailSymbol':'🚂',
  'RectangleHorizontal':'▭','RectangleVertical':'▯',
  'Replace':'🔄','ReplaceAll':'🔄🔄','Reset':'🔄',
  'Rewind':'⏪','Ribbon':'🎀','RockingChair':'🪑',
  'Rotate3d':'↻','RotateCcw':'↺','RotateCw':'↻','Route':'📍→','Router':'📡',
  'Rows':'⊞','RussianRuble':'₽',
  'SaveAll':'💾💾','Scale3d':'⚖','Scaling':'⚖',
  'ScanBarcode':'📷📊','ScanEye':'📷👁','ScanQrCode':'📷📱','ScanSearch':'📷🔍',
  'ScanText':'📷📝','ScatterChart':'📊',
  'ScreenShareOff':'📺🚫',
  'Section':'§','SeparatorHorizontal':'—','SeparatorVertical':'|',
  'ServerCog':'🖥⚙','ServerStack':'🖥🖥',
  'Shapes':'🔶','Share3':'📤','Sheet':'📊','Shell':'🐚',
  'ShieldBan':'🛡🚫','ShieldEllipsis':'🛡⋯',
  'ShieldHalf':'🛡','ShieldMinus':'🛡−','ShieldPlus':'🛡+',
  'Ship':'🚢','ShipWheel':'⚙',
  'Sidebar':'⊞','SidebarClose':'⊞','SidebarOpen':'⊞',
  'SkipForward':'⏩',
  'SortAsc':'⬆☰','SortDesc':'⬇☰',
  'SourceCode':'</>','Spade':'♠','Sparkle':'✨',
  'SpellCheck2':'✓Aa',
  'SprayCan':'🎨','SquareUser':'□👤','SquareUserRound':'□👤',
  'Squirrel':'🐿',
  'SunDim':'☀🌥','SunMedium':'☀','SunMoon':'☀🌙','SunSnow':'☀❄',
  'Superscript':'x²','SwatchBook':'🎨','SwissFranc':'₣',
  'TableCellsMerge':'📊→','TableCellsSplit':'📊←',
  'TableColumnsSplit':'📊↔','TableOfContents':'📑','TableRowsSplit':'📊↕',
  'TabletSmartphone':'📱',
  'Tally1':'I','Tally2':'II','Tally3':'III','Tally4':'IV','Tally5':'V',
  'Tangent':'tan',
  'TentTree':'⛺',
  'Terminal':'💻','TestTubeDiagonal':'🧪',
  'TextCursorInput':'|📝','TextQuote':'💬','TextSearch':'📝🔍',
  'ThermometerSnowflake':'🌡❄','ThermometerSun':'🌡☀',
  'TicketCheck':'🎫✓','TicketMinus':'🎫−','TicketPercent':'🎫%',
  'TicketsPlane':'🎫✈','TimerOff':'⏱🚫','ToggleRight':'🔘',
  'Toilet':'🚽','Tongue':'😛',
  'Torus':'⭕','TouchpadOff':'🖐🚫',
  'TrafficCone':'🛑',
  'TrainTrack':'🚂','TramFront':'🚊',
  'Trees':'🌳🌳','TriangleRight':'▶',
  'Turtle':'🐢',
  'Utensils':'🍴','UtensilsCrossed':'🍴✝','UtilityPole':'🏗',
  'Vacuum':'🧹','Vault':'🔒',
  'VideoOff':'🎬🚫',
  'Walk':'🚶',
  'WavesLadder':'🌊',
  'WifiHigh':'📶','WifiLow':'📶','WifiZero':'📶',
  'XSquare':'✕□',
  'ZapOff':'⚡🚫',
}

// ==================== PATH MAP ====================
function reconstructPath(truncated) {
  if (truncated === 'dex.vue') return 'index.vue'
  if (truncated.startsWith('/')) return 'ai' + truncated

  const map = {
    'out':'about','tivity':'activity','dress':'address','min':'admin',
    'tersale':'aftersale','ent':'agent','ents':'agents','reement':'agreement',
    'nouncements':'announcements','peal':'appeal','ticle':'article',
    'ticles':'articles','th':'auth','oking':'booking','ts':'bots',
    'unty':'bounty','ll':'call','rt':'cart','at':'chat','eckout':'checkout',
    'rcles':'circles','mmon':'common','ntacts':'contacts','ntent':'content',
    'upons':'coupons','urse':'course','urses':'courses','eator':'creator',
    'stomer-service':'customer-service','mo':'demo','sign':'design',
    'tail':'detail','scover':'discover','wnloads':'downloads','afts':'drafts',
    'rnings':'earnings','ook':'ebook','itor':'editor','ror':'error',
    'ror-pages':'error-pages','pert':'expert','perts':'experts',
    'vorites':'favorites','edback':'feedback','ash-sale':'flash-sale',
    'llows':'follows','rgot-password':'forgot-password','rtune':'fortune',
    'lp':'help','story':'history','dex':'index','stitute':'institute',
    'terests-guide':'interests-guide','vite':'invite','in':'join',
    'arn':'learn','arning':'learning',
  }
  const parts = truncated.split('/')
  const first = parts[0]
  if (map[first]) { parts[0] = map[first]; return parts.join('/') }
  return null
}

// ==================== V0 SOURCE FINDER ====================
function findV0Source(mobileRelPath) {
  const parts = mobileRelPath.replace(/\\/g, '/').split('/')

  // Direct path: mobile/xxx/index.vue -> V0/xxx/page.tsx
  const directPath = path.join(V0_ROOT, ...parts.slice(0, -1), 'page.tsx')
  if (fs.existsSync(directPath)) return directPath

  // Bracket param: mobile/xxx/id-detail/index.vue -> V0/xxx/[id]/page.tsx
  // Also: xxx/expert-detail -> [expert], xxx/expertId-detail -> [expertId]
  const lastDir = parts[parts.length - 2]
  if (lastDir && lastDir.includes('-detail')) {
    const parentDir = path.join(V0_ROOT, ...parts.slice(0, -2))
    if (fs.existsSync(parentDir)) {
      const entries = fs.readdirSync(parentDir)
      for (const entry of entries) {
        if (entry.startsWith('[') && entry.endsWith(']')) {
          const candidate = path.join(parentDir, entry, 'page.tsx')
          if (fs.existsSync(candidate)) return candidate
        }
      }
    }
  }

  // Nested bracket: mobile/xxx/yyy/zzz-detail/index.vue -> V0/xxx/[param]/page.tsx
  for (let i = parts.length - 2; i >= 1; i--) {
    const parentCheck = path.join(V0_ROOT, ...parts.slice(0, i))
    if (fs.existsSync(parentCheck)) {
      const entries = fs.readdirSync(parentCheck)
      for (const entry of entries) {
        if (entry.startsWith('[') && entry.endsWith(']')) {
          const remaining = parts.slice(i, -1)
          const candidate = path.join(parentCheck, entry, ...remaining, 'page.tsx')
          if (fs.existsSync(candidate)) return candidate
        }
      }
    }
  }

  return null
}

// ==================== BACKUP ====================
function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const rel = path.relative(MOBILE_PAGES, filePath)
  const bkDir = path.join(BACKUP_DIR, path.dirname(rel))
  if (!fs.existsSync(bkDir)) fs.mkdirSync(bkDir, { recursive: true })
  const bkPath = path.join(bkDir, path.basename(rel) + '.' + Date.now() + '.bak')
  fs.copyFileSync(filePath, bkPath)
}

// ==================== CONVERTER ====================
function convertToVue(v0Content) {
  // Extract return JSX - handle trailing whitespace/newlines after }
  const funcMatch = v0Content.match(/export default\s+function\s+\w+\s*\([^)]*\)\s*\{([\s\S]*)\}\s*$/)
  if (!funcMatch) return null
  const funcBody = funcMatch[1]

  // Find ALL return blocks in the body (for multi-return components)
  // Strategy: find the LAST return as the main/default template
  let tpl = ''
  let scriptLogic = ''

  // Check if there's a return with parentheses: return (
  const retParenMatch = funcBody.match(/return\s*\(([\s\S]*?)\)\s*;?\s*$/m)
  // Check if there's a return without parentheses: return <tag>
  const retTagMatch = funcBody.match(/return\s*(<[\s\S]*?>[\s\S]*?<\/\w+>)\s*;?\s*$/m)
  // Check for self-closing: return <Tag />
  const retSelfCloseMatch = funcBody.match(/return\s*(<\w+(?:[^>]*)\/>)\s*;?\s*$/m)

  if (retParenMatch) {
    tpl = retParenMatch[1]
  } else if (retTagMatch) {
    tpl = retTagMatch[1]
  } else if (retSelfCloseMatch) {
    tpl = retSelfCloseMatch[1]
  } else {
    return null
  }

  // Extract logic before the LAST return
  // Find the last occurrence of 'return ' to get logic before it
  const lastReturnIdx = funcBody.lastIndexOf('return ')
  if (lastReturnIdx > 0) {
    scriptLogic = funcBody.slice(0, lastReturnIdx)
  }

  // Extract mock data
  let mockData = ''
  const dataMatch = v0Content.match(/(\/\/.*\nconst\s+\w+\s*=\s*(?:\[[\s\S]*?\]|\{[\s\S]*?\}|['\"].*?['\"])[\s\S]*?)(?=export default)/)
  if (dataMatch) mockData = dataMatch[1]
  // Also try without leading comment
  if (!mockData) {
    const dataMatch2 = v0Content.match(/(const\s+\w+\s*=\s*(?:\[[\s\S]*?\]|\{[\s\S]*?\})[\s\S]*?)(?=export default)/)
    if (dataMatch2) mockData = dataMatch2[1]
  }

  // ============ TEMPLATE ============

  // 1. Comments
  tpl = tpl.replace(/\{\/\*\s*([\s\S]*?)\s*\*\/\}/g, '<!-- $1 -->')

  // 2. Conditional {cond && <tag>} -> v-if
  tpl = tpl.replace(
    /\{(\w+(?:\.\w+)*)\s*&&\s*(<(?:view|text|image|header|main|footer|section|nav|article)[^>]*>)/g,
    (m, cond, tag) => tag.replace(/^<(\w+)/, '<$1 v-if="' + cond + '"')
  )
  // {!cond && <tag>}
  tpl = tpl.replace(
    /\{!(\w+(?:\.\w+)*)\s*&&\s*(<(?:view|text|image|header|main|footer|section|nav|article)[^>]*>)/g,
    (m, cond, tag) => tag.replace(/^<(\w+)/, '<$1 v-if="!' + cond + '"')
  )
  // Remove trailing } after conditional tags
  tpl = tpl.replace(/\}(\s*<\/(view|text|image|header|main|footer|section|nav|article)>)/g, '$1')
  tpl = tpl.replace(/\}\s*\n/g, '\n')

  // 3. cn() -> []
  tpl = tpl.replace(
    /cn\(\s*(['\"][\s\S]*?['\"])\s*(?:,\s*([^)]+?)\s*)?\)/g,
    (m, base, rest) => {
      if (!rest) return base
      const parts = [base]
      const items = rest.split(/,(?=(?:[^'\"']*['\"'][^'\"']*['\"'])*[^'\"']*$)/)
      for (const item of items) {
        const t = item.trim()
        if (!t) continue
        const cv = t.match(/^(\w+(?:\.\w+)*)\s*&&\s*(['\"][^'\"]*['\"])$/)
        if (cv) { parts.push(cv[1] + ' ? ' + cv[2] + " : ''"); continue }
        parts.push(t)
      }
      return parts.length === 1 ? base : '[' + parts.join(', ') + ']'
    }
  )

  // 4. className -> class
  tpl = tpl.replace(/className=/g, 'class=')

  // 5. Events
  tpl = tpl.replace(/onClick=\{([^}]+)\}/g, '@click="$1"')
  tpl = tpl.replace(/onChange=\{([^}]+)\}/g, '@change="$1"')
  tpl = tpl.replace(/onBlur=\{([^}]+)\}/g, '@blur="$1"')
  tpl = tpl.replace(/onFocus=\{([^}]+)\}/g, '@focus="$1"')
  tpl = tpl.replace(/onSubmit=\{([^}]+)\}/g, '@submit="$1"')
  tpl = tpl.replace(/onKeyDown=\{([^}]+)\}/g, '@keydown="$1"')
  tpl = tpl.replace(/onTouchStart=\{([^}]+)\}/g, '@touchstart="$1"')
  tpl = tpl.replace(/onTouchEnd=\{([^}]+)\}/g, '@touchend="$1"')
  tpl = tpl.replace(/onMouseEnter=\{([^}]+)\}/g, '@mouseenter="$1"')
  tpl = tpl.replace(/onMouseLeave=\{([^}]+)\}/g, '@mouseleave="$1"')
  tpl = tpl.replace(/key=\{([^}]+)\}/g, ':key="$1"')
  tpl = tpl.replace(/value=\{([^}]+)\}/g, ':value="$1"')
  tpl = tpl.replace(/defaultValue=\{([^}]+)\}/g, ':default-value="$1"')
  tpl = tpl.replace(/disabled=\{([^}]+)\}/g, ':disabled="$1"')
  tpl = tpl.replace(/readOnly=\{([^}]+)\}/g, ':readonly="$1"')
  tpl = tpl.replace(/placeholder=\{([^}]+)\}/g, ':placeholder="$1"')
  tpl = tpl.replace(/type=\{([^}]+)\}/g, ':type="$1"')
  tpl = tpl.replace(/src=\{([^}]+)\}/g, ':src="$1"')
  tpl = tpl.replace(/alt=\{([^}]+)\}/g, ':alt="$1"')
  tpl = tpl.replace(/href=\{([^}]+)\}/g, ':href="$1"')
  tpl = tpl.replace(/rows=\{([^}]+)\}/g, ':rows="$1"')
  tpl = tpl.replace(/maxLength=\{([^}]+)\}/g, ':maxlength="$1"')

  // 6. class={} -> :class
  tpl = tpl.replace(/class=\{([^}]+)\}/g, ':class="$1"')
  tpl = tpl.replace(/class=\[([^\]]+)\]/g, ':class="[$1]"')

  // 7. Link -> view
  tpl = tpl.replace(
    /<Link\s+href=(['\"])([^'\"]+)\1[^>]*>([\s\S]*?)<\/Link>/g,
    (m, q, href, content) => {
      let target = href
      if (target.startsWith('/') && !target.startsWith('/pages')) target = '/pages' + target
      return '<view @click="goTo(\'' + target + '\')">' + content + '</view>'
    }
  )

  // 8. Tag conversions
  tpl = tpl.replace(/<div(\s|>)/g, '<view$1').replace(/<\/div>/g, '</view>')
  tpl = tpl.replace(/<span(\s|>)/g, '<text$1').replace(/<\/span>/g, '</text>')
  tpl = tpl.replace(/<p(\s|>)/g, '<text$1').replace(/<\/p>/g, '</text>')
  tpl = tpl.replace(/<button(\s|>)/g, '<view$1').replace(/<\/button>/g, '</view>')
  tpl = tpl.replace(/<label(\s|>)/g, '<view$1').replace(/<\/label>/g, '</view>')
  tpl = tpl.replace(/<a(\s|>)/g, '<view$1').replace(/<\/a>/g, '</view>')
  tpl = tpl.replace(/<h([1-6])(\s|>)/g, '<view$2').replace(/<\/h[1-6]>/g, '</view>')
  tpl = tpl.replace(/<img(\s)/g, '<image$1').replace(/<\/img>/g, '')
  tpl = tpl.replace(/<select(\s|>)/g, '<picker$1').replace(/<\/select>/g, '</picker>')
  tpl = tpl.replace(/<option(\s|>)/g, '<picker-item$1').replace(/<\/option>/g, '</picker-item>')
  tpl = tpl.replace(/<>\s*/g, '').replace(/\s*<\/>/g, '')
  tpl = tpl.replace(/<React\.Fragment>/g, '').replace(/<\/React\.Fragment>/g, '')

  // 9. Icons -> emoji
  for (const [name, emoji] of Object.entries(ICONS)) {
    const re = new RegExp('<' + name + '([^>]*)/\\s*>', 'g')
    tpl = tpl.replace(re, (m, attrs) => {
      const clsMatch = attrs.match(/class=(['\"])([^'\"]*)\1/)
      const cls = clsMatch ? clsMatch[2] : ''
      return '<text' + (cls ? ' class="' + cls + '"' : '') + '>' + emoji + '</text>'
    })
    const re2 = new RegExp('<' + name + '([^>]*)>[\\s\\S]*?<\\/' + name + '\\s*>', 'g')
    tpl = tpl.replace(re2, (m, attrs) => {
      const clsMatch = attrs.match(/class=(['\"])([^'\"]*)\1/)
      const cls = clsMatch ? clsMatch[2] : ''
      return '<text' + (cls ? ' class="' + cls + '"' : '') + '>' + emoji + '</text>'
    })
  }
  tpl = tpl.replace(/<item\.icon[^>]*\/>/g, '<text class="w-5 h-5 text-primary">🔷</text>')
  tpl = tpl.replace(/<\w+\.\w+[^>]*\/>/g, '<text>🔷</text>')

  // 10. Component -> tag mappings
  const COMP_MAP = {
    'Card':'view','Badge':'text','Input':'input','Textarea':'textarea',
    'Avatar':'view','AvatarImage':'image','AvatarFallback':'text',
    'Separator':'view','Skeleton':'view',
    'Tabs':'view','TabsList':'view','TabsTrigger':'view','TabsContent':'view',
    'Dialog':'view','DialogContent':'view','DialogHeader':'view','DialogTitle':'text',
    'DialogDescription':'text','DialogFooter':'view',
    'Sheet':'view','SheetContent':'view','SheetHeader':'view','SheetTitle':'text',
    'ScrollArea':'scroll-view',
    'Switch':'switch','RadioGroup':'radio-group','Checkbox':'checkbox',
    'Progress':'progress','Slider':'slider',
  }
  for (const [comp, tag] of Object.entries(COMP_MAP)) {
    tpl = tpl.replace(new RegExp('<' + comp + '\\b', 'g'), '<' + tag)
    tpl = tpl.replace(new RegExp('</' + comp + '>', 'g'), '</' + tag + '>')
  }
  // BackButton
  tpl = tpl.replace(
    /<BackButton[^>]*\/>/g,
    '<view class="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors" @click="goBack()"><text class="w-5 h-5 text-foreground">←</text></view>'
  )

  // 11. .map() -> v-for
  let attempts = 0
  while (tpl.includes('.map(') && attempts < 20) {
    attempts++
    const mm = tpl.match(/\{(\w+)\.map\(\s*(?:\((\w+)(?:\s*,\s*(\w+))?\)|(\w+))\s*=>\s*\(([\s\S]*?)\)\s*\)\s*\}/)
    if (!mm) break
    let [, arr, i1, idx, i2, content] = mm
    const item = i1 || i2
    let keyExpr = ''
    content = content.replace(/:key=(['\"])([^'\"]*)\1/g, (m, q, kv) => { keyExpr = ' :key="' + kv + '"'; return '' })
    content = content.replace(/\s*key=(['\"])([^'\"]*)\1/g, (m, q, kv) => { keyExpr = ' :key="' + kv + '"'; return '' })
    const vfor = ' v-for="(' + item + (idx ? ', ' + idx : '') + ') in ' + arr + '"' + keyExpr
    content = content.replace(/^<(\w+)/, '<$1' + vfor)
    tpl = tpl.replace(mm[0], content)
  }

  // 12. {var} -> {{ var }}
  tpl = tpl.replace(/\{(\w+(?:\.\w+)*(?:\[\d+\])?)\}/g, '{{ $1 }}')

  // Fix directive values
  const DIRS = ['v-if','v-for',':key',':class','@click','@change','@input','@touchstart','@touchend',
    '@submit','@mouseenter','@mouseleave','@blur','@focus','@keydown',
    ':value',':disabled',':placeholder',':src',':type',':alt',':href',':rows',':maxlength',
    ':readonly',':default-value','v-html']
  for (const dir of DIRS) {
    const re = new RegExp(dir + '="\\{\\{(.*?)\\}\\}"', 'g')
    tpl = tpl.replace(re, dir + '="$1"')
  }

  // 13. Fix self-closing tags for non-void elements
  const VOID_TAGS = ['input','image','switch','progress','slider']
  for (const tag of VOID_TAGS) {
    const re = new RegExp('<' + tag + '([^>]*)\\/>', 'g')
    tpl = tpl.replace(re, '<' + tag + '$1>')
  }
  // Non-void tags need closing
  const NONVOID = ['view','text','scroll-view','radio-group','checkbox']
  for (const tag of NONVOID) {
    const re = new RegExp('<' + tag + '([^>]*)\\/>', 'g')
    tpl = tpl.replace(re, '<' + tag + '$1></' + tag + '>')
  }

  // 14. Clean up
  tpl = tpl.replace(/\n{3,}/g, '\n\n').trim()

  // ============ SCRIPT ============

  // Convert script logic
  let scr = ''

  // useState -> ref
  scriptLogic = scriptLogic.replace(
    /const\s+\[(\w+),\s*set(\w+)\]\s*=\s*useState\(/g,
    (m, name) => 'const ' + name + ' = ref('
  )

  // setX(val) -> x.value = val (simple cases)
  scriptLogic = scriptLogic.replace(/set(\w+)\((\w+(?:\.\w+)*(?:\[\d+\])?)\)/g, (m, name, val) => {
    const lower = name.charAt(0).toLowerCase() + name.slice(1)
    return lower + '.value = ' + val
  })
  // setX(null) -> x.value = null
  scriptLogic = scriptLogic.replace(/set(\w+)\(null\)/g, (m, name) => {
    const lower = name.charAt(0).toLowerCase() + name.slice(1)
    return lower + '.value = null'
  })
  // setX(false) -> x.value = false
  scriptLogic = scriptLogic.replace(/set(\w+)\(false\)/g, (m, name) => {
    const lower = name.charAt(0).toLowerCase() + name.slice(1)
    return lower + '.value = false'
  })
  // setX(true) -> x.value = true
  scriptLogic = scriptLogic.replace(/set(\w+)\(true\)/g, (m, name) => {
    const lower = name.charAt(0).toLowerCase() + name.slice(1)
    return lower + '.value = true'
  })

  // useEffect -> onMounted/watch
  scriptLogic = scriptLogic.replace(
    /useEffect\s*\(\s*\(\)\s*=>\s*\{([\s\S]*?)},\s*\[([^\]]*)\]\s*\)/g,
    (m, body, deps) => {
      const dl = deps.split(',').map(d => d.trim()).filter(Boolean)
      return dl.length === 0
        ? 'onMounted(() => {' + body + '})'
        : 'watch([' + deps + '], () => {' + body + '})'
    }
  )

  // router -> uni
  scriptLogic = scriptLogic.replace(/router\.back\(\)/g, 'uni.navigateBack()')
  scriptLogic = scriptLogic.replace(/router\.push\(/g, 'uni.navigateTo(')

  // Remove imports
  scriptLogic = scriptLogic.replace(/^import\s+.*?from\s+['\"].*?['\"]\s*;?\s*$/gm, '')

  // Clean mock data
  mockData = mockData.replace(/^import\s+.*?from\s+['\"].*?['\"]\s*;?\s*$/gm, '').trim()

  // Build final
  scr = '<script setup lang="ts">\n'
  scr += "import { ref, reactive, computed, onMounted, watch } from 'vue'\n"
  scr += "import { onLoad, onShow, onHide } from '@dcloudio/uni-app'\n\n"
  scr += '// 导航辅助\n'
  scr += 'function goBack() { uni.navigateBack() }\n'
  scr += 'function goTo(url: string) { uni.navigateTo({ url }) }\n\n'
  if (mockData) scr += '// Mock 数据\n' + mockData + '\n\n'
  const logic = scriptLogic.trim()
  if (logic) scr += '// 组件逻辑\n' + logic + '\n'
  scr += '</script>\n'

  const sx = '<style scoped>\n/* 样式由 Tailwind 处理 */\n</style>'

  return '<template>\n' + tpl + '\n</template>\n\n' + scr + '\n' + sx
}

// ==================== MAIN ====================
async function main() {
  console.log('='.repeat(60))
  console.log('Batch 1 -> Tailwind Vue3 (COVERAGE MODE)')
  console.log('='.repeat(60))

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })

  const lines = fs.readFileSync(BATCH_FILE, 'utf-8')
    .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))

  console.log('\nTotal: ' + lines.length + ' files\n')

  let ok = 0, skip = 0, err = 0

  for (let i = 0; i < lines.length; i++) {
    const truncated = lines[i]
    const relPath = reconstructPath(truncated)
    if (!relPath) {
      console.log('[SKIP ' + (i+1) + '/' + lines.length + '] Unknown: ' + truncated)
      skip++
      continue
    }

    const targetFile = path.join(MOBILE_PAGES, relPath)
    console.log('[' + (i+1) + '/' + lines.length + '] ' + relPath)

    backupFile(targetFile)

    const v0File = findV0Source(relPath)

    let result = null
    let from = ''

    if (v0File && fs.existsSync(v0File)) {
      const v0Content = fs.readFileSync(v0File, 'utf-8')
      result = convertToVue(v0Content)
      from = 'V0: ' + path.relative(V0_ROOT, v0File)
    } else if (fs.existsSync(targetFile)) {
      // Fallback: read existing, wrap with Tailwind
      const existing = fs.readFileSync(targetFile, 'utf-8')
      // Simple enhancement
      result = existing
      if (!existing.includes('min-h-screen')) {
        result = result.replace(
          /<template>/,
          '<template>\n<view class="min-h-screen bg-background">'
        )
        const endIdx = result.lastIndexOf('</template>')
        if (endIdx > 0) {
          result = result.slice(0, endIdx) + '</view>\n' + result.slice(endIdx)
        }
      }
      from = 'EXISTING (no V0)'
    }

    if (result) {
      const dir = path.dirname(targetFile)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(targetFile, result, 'utf-8')
      console.log('  OK (' + from + ')')
      ok++
    } else {
      console.log('  SKIP (no source)')
      skip++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Done: ' + ok + ' ok, ' + skip + ' skip, ' + err + ' err')
  console.log('='.repeat(60))
}

// Only run if executed directly
if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1) })
} else {
  module.exports = { convertToVue, findV0Source, reconstructPath }
}
