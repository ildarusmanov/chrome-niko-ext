var NIKONIKO = {
  REQUEST: null,
  RENDER_TIMER: null,

  getBg: function() {
    return chrome.extension.getBackgroundPage().NIKONIKO_BG;
  },

  getStorage: function() {
    return this.getBg().getStorage();
  },

  storageLocked: function() {
    return this.getBg().storageLocked();
  },

  clearStorage: function() {
    this.getBg().clearStorage();
  },

  ajaxRequest: function(opts) {
    if(this.REQUEST) return;
    $('#loading').show().delay(500);
    this.REQUEST = $.ajax(opts);
  },

  ajaxFree: function() {
    this.REQUEST = null;
    $('#loading').hide();
  },

  startRender: function(callback) {
    this.stopRender();
    this.RENDER_TIMER = setInterval(5000, function(){
      callback();
    });
  },

  stopRender: function() {
    if(this.RENDER_TIMER == null) return;
    clearInterval(this.RENDER_TIMER);
    this.RENDER_TIMER = null;
  },

  setAllRead: function() {
    $('.notifications_count').hide();
  },

  setUnread: function(cnt) {
    if(cnt == 0) return this.setAllRead();
    $('.notifications_count').show();
    $('.notifications_count').html(cnt + '');
  },

  readNotification: function(id){
    self = this;
    this.getBg().readNotification(id);
    $('#notification_' + id).removeClass('unread_notification');
    $('#notification_' + id).hide();
    this.ajaxRequest({
      url:  self._url('api/v1/notifications/' + id),
      data: { _method: 'PUT' },
      type: 'POST',
      dataType: 'json',
      success: function(data, textStatus, jqXHR){
        self.ajaxFree();
        self.setNotifications(data);
      }
    });
  },


  setNotifications: function(){
    n_count = 0;
    var notifications = this.getNotifications();
    for(i in notifications){
      var n = notifications[i];
      if(n.unread) n_count++;
    }
    this.setUnread(n_count);
  },

  getNotifications: function(){
    return this.getBg().getNotifications();
  },

  setActivePage: function(page) {
    this.stopRender();
    this.getBg().setActivePage(page);
    $('#menu li a.active').removeClass('active');
    $('#menu li a[data-target="' + page + '"]').addClass('active');
  },

  getActivePage: function(){
    return this.getBg().getActivePage();
  },

  setActiveTeam: function(team_id) {
    this.getBg().setActiveTeam(team_id);
  },

  getActiveTeam: function(){
    return this.getBg().getActiveTeam();
  },

  setUser: function(data){
    this.getBg().setUser(data);
  },

  getUser: function(){
    return this.getBg().getUser();
  },

  getToken: function(){
    return this.getBg().getToken();
  },

  isGuest: function(){
    return this.getBg().isGuest();
  },

  _url: function(page){
    return this.getBg()._url(page);
  },

  showWindow: function(class_name){
    $('#screens .screen').hide();
    $('#screens .screen').removeClass('active');

    $('#screens').find('.screen.' + class_name).show(0);
    $('#screens').find('.screen.' + class_name).addClass('active');

    this.setActivePage(class_name);

    if(class_name == 'sign_in'){
      $('#header #menu').hide(0);
    }else{
      $('#header #menu').show(0);
    }
  },

  showMessage: function(text){
    $('.alert').html(text).fadeIn(100).delay(1000).fadeOut(300).hide(0);
  },

  signOut: function(){
    this.clearStorage();
    this.hideMenu();
    this.showWindow('sign_in');
  },

  signIn: function(form){
    self = this;
    this.ajaxRequest({
      url: self._url($(form).attr('action')),
      type: 'POST',
      data: $(form).serialize(),
      dataType: 'json',
      success: function(data, textStatus, jqXHR){
        self.ajaxFree();
        if(data.status == 'failure'){
          self.showMessage('Error!');
          self.clearStorage();
          self.hideMenu();
        }else{
          self.showMessage('Authorized!');
          self.showMenu();
          self.setUser(data);
          self.showTeams();
        }
      }
    });
  },

  renderTeams: function(teams){
    $('#screens .teams ul.list').html('');
    for(i in teams){
      var t = teams[i];
      var html = '<li><a data-team-id="' + t.id + '" href="#">' + t.title + '</a></li>';
      $('#screens .teams ul').append(html);
    }

    this.bindEvents();
  },

  loadTeams: function(){
    self = this;
    this.ajaxRequest({
      url:  self._url('api/v1/groups/joined'),
      dataType: 'json',
      success: function(data, textStatus, jqXHR){
        self.ajaxFree();
        self.renderTeams(data);
      }
    });
  },

  renderQuestions: function(questions){
    $('#screens .questions ul.list').html('');
    for(i in questions){
      var q = questions[i];
      var html = '<li><a data-question-id="' + q.id + '" href="#">' + q.text + '</a></li>';
      $('#screens .questions ul').append(html);
    }

    this.bindEvents();
  },

  loadQuestions: function(){
    self = this;
    this.ajaxRequest({
      url:  self._url('api/v1/groups/' + self.getActiveTeam() + '/active_questions'),
      dataType: 'json',
      success: function(data, textStatus, jqXHR){
        self.ajaxFree();
        self.renderQuestions(data.questions);
      }
    });
  },

  sendAnswerForm: function(){
    self = this;
    var v = $('#screens .answer ul.values li a.selected_value:first').attr('data-value');
    $('input[name="niko[value]"]').val(v);
    $('input[name="niko[group_id]"]').val(self.getActiveTeam());

    this.ajaxRequest({
      url: self._url('api/v1/nikos'),
      method: 'POST',
      data: $('#screens .answer form').serialize(),
      dataType: 'json',
      success: function(data, textStatus, jqXHR){
        self.ajaxFree();
        if(data.status == 'success'){
        	self.showMessage('Answer successfully sent!');
        self.showTeams();
        }else{
        	self.showMessage('Error!');
        }
      }
    });
  },

  showSignIn: function(){
  this.showWindow('sign_in');
  },

  showTeams: function(){
    this.loadTeams();

    this.showWindow('teams');

    self = this;

    this.startRender(function() {
      self.loadTeams();
    });
  },

  showQuestions: function(){
    this.loadQuestions();

    this.showWindow('questions');

    this.startRender(function() {
      this.loadTQuestions();
    });
  },

  showAnswerForm: function(question_id){
    $('#screens .answer h1').html('Q: ' + $('[data-question-id="' + question_id + '"]').html());
    $('#screens .answer ul.values li a.selected_value').removeClass('selected_value');
    $('#screens .answer ul.values li a.value_50').addClass('selected_value');
    $('#screens .answer input[name="niko[question_id]"]').val(question_id);
    this.showWindow('answer');
  },

  renderNotifications: function(){
    self = this;

    var notifications = this.getNotifications();
    var html = '';

    for(i in notifications){
      var notification = notifications[i];
      var class_name = 'notification';
      if(notification.unread){
        class_name = 'unread_notification';
      }

      html = '<li class="' + class_name + '" id="notification_' + notification.id + '">You have new question: <a href="#" data-notification-id="' + notification.id + '">' + notification.subject + '</a></li>' + html;
    }

    $('#screens .screen.notifications .list').html(html);

    $('#screens .screen.notifications .list a').click(function(){
      var id = $(this).data('notification-id');
      self.showNotification(id);
    });
  },

  showNotifications: function(){
    this.renderNotifications();

    this.showWindow('notifications');

    this.startRender(function() {
      this.renderNotifications();
    });
  },

  showNotification: function(notification_id){
    var id = parseInt(notification_id);
    var notifications = this.getNotifications();
    var notification = null;
    for(i in notifications){
      if(notifications[i].id == id){
        notification = notifications[i];
        break;
      }
    }
    if(notification == null) return;
    this.setActiveTeam(notification.group_id);
    this.showAnswerForm(notification.body);
    $('#screens .answer h1').html('Q: ' + notification.subject);
    this.showWindow('answer');
    this.readNotification(notification.id);
  },

  readAllNotifications: function() {
    var notifications = this.getNotifications();
    for(i in notifications){
      var notification = notifications[i];
      if(notification.unread){
        this.readNotification(notification.id);
      }
    }
  },

  bindEvents: function(){
    var self = this;

    $('#screens .sign_in form').on('submit', function(e){
      e.preventDefault();
      self.signIn(this);
    });

    $('#screens .teams ul.list li a').click(function(e){
      e.preventDefault();
      self.setActiveTeam($(this).attr('data-team-id'));
      self.showQuestions();
    });


    $('#screens .questions ul.list li a').click(function(e){
      e.preventDefault();
      self.showAnswerForm($(this).attr('data-question-id'));
    });

    $('#screens .answer ul.values li a').click(function(e){
      e.preventDefault();
      $('#screens .answer ul.values li a.selected_value').removeClass('selected_value');
      $(this).addClass('selected_value');
    });

    $('#screens .answer form').on('submit', function(e){
      e.preventDefault();
      self.sendAnswerForm();
    });

    $('#screens .notifications .mark_all_as_read').click(function(e){
      e.preventDefault();
      self.readAllNotifications();
    });

    $('#menu li a').click(function(e){
      e.preventDefault();
      var target = $(this).data('target');
      self.routeByTarget(target);
    });
  },

  routeByTarget: function(target){
    if(target == 'teams') {
      self.showTeams();
    }else if(target == 'sign_in') {
      self.showSignIn();
    }else if(target == 'sign_out') {
      self.signOut();
    }else if(target == 'notifications'){
      self.showNotifications();
    }else{
      return false;
    }
  },

  hideMenu: function(){
    $('#menu li').hide();
  },

  showMenu: function(){
    $('#menu li').show();
  },

  reloadStorage: function(){
    if(this.isGuest()) {
      return false;
    }
    this.setNotifications();
  },

  init: function(){
    self = this;

    setInterval(function(){ self.reloadStorage(); }, 500);

    if(this.isGuest()){
      this.showSignIn();
      this.hideMenu();
    }else{
      this.showMenu();
      if(this.getActivePage() == 'questions'){
        this.showQuestions();
      }else if(this.getActivePage() == 'questions'){
        this.showNotifications();
      }else{
        this.showTeams();
      }
    }
  },

  run: function(){
    self = this;
    this.bindEvents();
    this.getStorage().get(null, function(data){
      if(data != null) {
        self.setActiveTeam(data.active_team);
        self.setActivePage(data.active_page);
        self.setNotifications(data.notifications);
        self.setUser(data.userdata);
      }

      self.init();
    });
  }
};

$(document).ready(function () {
  NIKONIKO.run();
});
