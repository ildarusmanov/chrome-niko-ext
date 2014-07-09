
var NIKONIKO_BG = {
  ENV_URL: 'http://nikoniko.co/',
  USER_DATA: null,
  ACTIVE_PAGE: null,
  ACTIVE_TEAM: null,
  STORAGE: chrome.storage.local,
  REQUEST: null,
  NOTIFICATIONS: [],

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

  updateStorage: function(){
    var data = {
      'userdata': this.getUser(),
      'active_team': this.getActiveTeam(),
      'active_page': this.getActivePage(),
      'notifications': this.getNotifications()
    };

    this.STORAGE.set(data, function(){
      //console.log('Saved to storage');
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
    console.log('setNotifications');
    console.log(data);

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

    this.updateStorage();

    if(this.isGuest()) return false;

    for(i in to_render) {
      this.renderQuestionNotification(to_render[i]);
    }

    n_count = 0;
    var all_notifications = this.getNotifications();
    for(i in all_notifications){
      var n = all_notifications[i];
      chrome.notifications.clear(n.id + '', function(wasCleared){;});
      if(n.unread) n_count++;
    }

    this.setUnread(n_count);
  },


  getNotifications: function(){
    return this.NOTIFICATIONS;
  },

  setActivePage: function(page) {
    this.ACTIVE_PAGE = page;
    this.updateStorage();
  },

  getActivePage: function(){
    return this.ACTIVE_PAGE;
  },

  setActiveTeam: function(team_id) {
    this.ACTIVE_TEAM = team_id;
    this.updateStorage();
  },

  getActiveTeam: function(){
    return this.ACTIVE_TEAM;
  },

  setUser: function(data){
    //console.log('setUser');
    //console.log(data);
    this.USER_DATA = data;
    this.updateStorage();
  },

  getUser: function(){
    return this.USER_DATA;
  },

  getToken: function(){
    if(this.isGuest()
      || this.getUser().token == 'undefined'
      || this.getUser().token == ''){
      return '';
    }else{
      return this.getUser().token;
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
        return this.ENV_URL + page + '?token=' + this.getToken();
      }
  },

  loadNotifications: function(){
      //console.log('load notifications');
      self = this;
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
        iconUrl: 'notification.png'//,
        //buttons: [{ title: 'Answer'}]
      };

      options.message = notification.subject;

      var self = this;

      chrome.notifications.onClicked.addListener(function(notification_id){;
        //var views = chrome.extension.getViews();
        //if(views.length > 0){
        //  views[0].NIKONIKO.showNotification(notification_id);
        //}
      });

      chrome.notifications.create(notification.id + '', options, function(){
        //console.log('created');
      });
  },

  init: function(){
    if(this.isGuest()) return false;
    this.loadNotifications();
  },

  run: function(){
      self = this;
      this.USER_DATA = null;
      this.STORAGE.get(null, function(r){
        //console.log('userdata from storage');
        //console.log(r);
        if(r == null){
          return;
        }
        //console.log(r.userdata);
        self.setActiveTeam(r.active_team);
        self.setActivePage(r.active_page);
        data = r.userdata;

        if(data == null || data == 'undefined' || data.token == null || data.token == 'undefined'){
          return;
        }

        self.setUser(data);
        self.init();
      });
  }
};


setInterval(function(){ NIKONIKO_BG.run(); }, 1000);

