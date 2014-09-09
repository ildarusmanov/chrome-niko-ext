var NIKONIKO_BG = {
  ENV_URL: 'http://www.nikoniko.co/',
  USER_DATA: null,
  ACTIVE_PAGE: null,
  ACTIVE_TEAM: null,
  STORAGE: chrome.storage.local,
  REQUEST: null,
  NOTIFICATIONS: [],
  STORAGE_LOCK: false,
  PAUSED: false,

  pause: function() {
    this.PAUSED = true;
  },

  resume: function() {
    this.PAUSED = false;
  },

  setAllRead: function() {
    var bs = chrome.browserAction;
    bs.setBadgeBackgroundColor({color: [0, 255, 0, 128]});
    bs.setBadgeText({text:  ""});   // <-- set text to "" to remove the badge
  },

  setUnread: function(cnt) {
    if(cnt == 0) {
      return this.setAllRead();
    }

    var bs = chrome.browserAction;
    bs.setBadgeBackgroundColor({color: [255, 0, 0, 128]});
    bs.setBadgeText({text: "" + cnt});
  },

  ajaxRequest: function(opts) {
    if(this.REQUEST) return;
    $('#loading').show().delay(500);
    this.REQUEST = $.ajax(opts);
  },

  ajaxFree: function(){
    this.REQUEST = null;
    $('#loading').hide();
  },

  getStorage: function(){
    return this.STORAGE;
  },

  lockStorage: function(){
    this.STORAGE_LOCK = true;
  },

  unlockStorage: function(){
    this.STORAGE_LOCK = false;
  },

  storageLocked: function(){
    return this.STORAGE_LOCK;
  },

  clearStorage: function(){
    self = this;
    this.getStorage().clear(function(){
      self.USER_DATA = null;
      self.ACTIVE_PAGE = null;
      self.ACTIVE_TEAM = null;
      self.NOTIFICATIONS = [];
    });
  },

  loadFromStorage: function(callback){
    this.getStorage().get(null, function(data){
      if(data == null) return callback();
      self.ACTIVE_TEAM = data.active_team;
      self.ACTIVE_PAGE = data.active_page;
      self.USER_DATA = data.userdata;
      callback();
    });
  },

  updateStorageStrong: function(callback){
    this.lockStorage();

    var data = {
      'userdata': this.getUser(),
      'active_team': this.getActiveTeam(),
      'active_page': this.getActivePage(),
      'notifications': this.getNotifications()
    };

    self = this;

    this.getStorage().set(data, function(){
      self.unlockStorage();
      callback();
    });
  },

  updateStorage: function(callback){
    if(this.storageLocked()){
      console.log('can`t save, storage locked');
      return;
    }

    this.lockStorage();

    var data = {
      'userdata': this.getUser(),
      'active_team': this.getActiveTeam(),
      'active_page': this.getActivePage(),
      'notifications': this.getNotifications()
    };

    self = this;

    this.getStorage().set(data, function(){
      self.unlockStorage();
      callback();
    });
  },

  notificationIndex: function(id){
    var notifications = this.getNotifications();
    for(i in notifications){
      if(id == notifications[i].id) return i;
    }
    return -1;
  },

  readNotification: function(id){
    console.log(this.getNotifications());
    var i = this.notificationIndex(parseInt(id));
    if(i >= 0) this.NOTIFICATIONS[i].unread = false;
    console.log(i);
  },

  setNotifications: function(data){
    var to_render = [];

    for(i in data) {
      //data[i].body = $.parseJSON(data[i].body);
      index = this.notificationIndex(data[i].id);
      if(index < 0){
        this.NOTIFICATIONS.push(data[i]);
        if(data[i].unread) to_render.push(data[i]);
      }else{
        data[index] = data[i];
      }
    }

    this.updateStorageStrong(function(){;});

    if(this.isGuest()) return false;

    n_count = 0;
    var all_notifications = this.getNotifications();
    for(i in all_notifications){
      var n = all_notifications[i];
      chrome.notifications.clear(n.id + '', function(wasCleared){;});
      if(n.unread) n_count++;
    }

    this.setUnread(n_count);

    for(i in to_render) {
      this.renderQuestionNotification(to_render[i]);
    }

  },


  getNotifications: function(){
    return this.NOTIFICATIONS;
  },

  setActivePage: function(page) {
    this.ACTIVE_PAGE = page;
    this.updateStorageStrong(function(){;});
  },

  getActivePage: function(){
    return this.ACTIVE_PAGE;
  },

  setActiveTeam: function(team_id) {
    this.ACTIVE_TEAM = team_id;
    this.updateStorageStrong(function(){;});
  },

  getActiveTeam: function(){
    return this.ACTIVE_TEAM;
  },

  setUser: function(data){
    //console.log('setUser');
    //console.log(data);
    this.USER_DATA = data;
    this.updateStorageStrong(function(){;});
  },

  getUser: function(){
    return this.USER_DATA;
  },

  getToken: function(){
    if(this.isGuest()
      || this.getUser().secret == 'undefined'
      || this.getUser().secret == ''){
      return '';
    }else{
      return this.getUser().secret;
    }
  },

  isGuest: function(){
    return (this.getUser() == null
      || this.getUser() == 'undefined'
      || this.getUser().token == null
    || this.getUser().token == '');
  },

  _url: function(page){
    if(this.getToken() == ''){
      return this.ENV_URL + page;
    }else{
      return this.ENV_URL + page + '?secret=' + this.getToken();
    }
  },

  loadNotifications: function(){
    console.log('load notifications');
    self = this;
    
    if(self.PAUSED) {
      return 0;
    }

    this.ajaxRequest({
      url:  self._url('api/v1/notifications'),
      dataType: 'json',
      success: function(data, textStatus, jqXHR){
        self.ajaxFree();
        //console.log('data notifications');
        //console.log(data);
        self.setNotifications(data);
      }
    });
  },

  renderQuestionNotification: function(notification){
    var options = {
      type: "basic",
      title: "You have new question!",
      message: "How are you feeling today?",
      iconUrl: 'notification.png'
    };

    options.message = notification.subject;

    var self = this;

    chrome.notifications.onClicked.addListener(function(notification_id){;
      //console.log('notification clicked');
    });

    chrome.notifications.create(notification.id + '', options, function(){
      //console.log('notification created');
    });
  },

  init: function(){
    self = this;
    setTimeout(function(){
      self.init();
    }, 1500);

    

    if(this.isGuest()){
      this.clearStorage();
      return false;
    }

    this.loadNotifications();
  },

  run: function(){
    self = this;
    this.USER_DATA = null;
    this.loadFromStorage(function() {
      self.init();
    })
  }
};

NIKONIKO_BG.run();
