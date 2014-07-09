
var NIKONIKO = {
	USER_DATA: null,
	ACTIVE_PAGE: null,
	ACTIVE_TEAM: null,
	STORAGE: chrome.storage.local,
	REQUEST: null,
  NOTIFICATIONS: [],

  setAllRead: function() {
    $('.notifications_count').hide();
  },

  setUnread: function(cnt) {
    if(cnt == 0){
      return this.setAllRead();
    }
    $('.notifications_count').show();
    $('.notifications_count').html(cnt + '');
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
			console.log('Saved to storage');
		});
	},

  readNotification: function(id){
    console.log('load notifications');
    self = this;
    chrome.extension.getBackgroundPage().NIKONIKO_BG.readNotification(id);
    this.ajaxRequest({
        url:  self._url('api/v1/notifications/' + id),
        data: { _method: 'PUT' },
        type: 'POST',
        dataType: 'json',
        success: function(data, textStatus, jqXHR){
          self.ajaxFree();
          console.log('data notifications');
          console.log(data);
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
    console.log(notifications);
    this.setUnread(n_count);
  },

  getNotifications: function(){
    return chrome.extension.getBackgroundPage().NIKONIKO_BG.getNotifications();
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
		console.log('setUser');
		console.log(data);
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
   		return chrome.extension.getBackgroundPage().NIKONIKO_BG._url(page);
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
   		this.setUser(null);
      this.hideMenu();
   		this.showWindow('sign_in');
   	},

   	signIn: function(form){
   		console.log('sign in');
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
	   				self.setUser(null);
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
   		console.log('load teams');
   		self = this;
   		this.ajaxRequest({
   			url:  self._url('groups/joined_groups'),
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
   		console.log('load questions');
   		self = this;
   		this.ajaxRequest({
   			url:  self._url('groups/' + self.getActiveTeam() + '/get_active_questions'),
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
   			url: self._url('nikos'),
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
   	},

   	showQuestions: function(){
   		this.loadQuestions();
   		this.showWindow('questions');
   	},

   	showAnswerForm: function(question_id){
   		$('#screens .answer h1').html('Q: ' + $('[data-question-id="' + question_id + '"]').html());
   		$('#screens .answer ul.values li a.selected_value').removeClass('selected_value');
   		$('#screens .answer ul.values li a.value_50').addClass('selected_value');
   		$('#screens .answer input[name="niko[question_id]"]').val(question_id);
   		this.showWindow('answer');
   	},

    showNotification: function(notification_id){
      console.log('show notification ' + notification_id);
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

    renderNotifications: function(){
      self = this;

      var notifications = this.getNotifications();
      var html = '';
      for(i in notifications){
        var notification = notifications[i];
        html = html + '<li>You have new question: <a href="#" data-notification-id="' + notification.id + '">' + notification.subject + '</a></li>';
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

   		$('#menu li a').click(function(e){
   			e.preventDefault();
   			var target = $(this).data('target');

   			if(target == 'teams') {
   				self.showTeams();
   			}

   			if(target == 'sign_in') {
   				self.showSignIn();
   			}

   			if(target == 'sign_out') {
   				self.signOut();
   			}

        if(target == 'notifications'){
          self.showNotifications();
        }

   		});
   	},

    hideMenu: function(){
      $('#menu li').hide();
    },

    showMenu: function(){
      $('#menu li').show();
    },

   	init: function(){
      setInterval(function(){ NIKONIKO.reloadStorage(); }, 500);

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

    reloadStorage: function(){
      if(this.isGuest()) return false;
      this.setNotifications();
    },

   	run: function(){
  		self = this;
  		this.bindEvents();
  		this.USER_DATA = null;
  		this.STORAGE.get(null, function(r){
  			console.log('userdata from storage');
  			console.log(r.userdata);
  			self.setActiveTeam(r.active_team);
  			self.setActivePage(r.active_page);
        self.setNotifications(r.notifications);
  			data = r.userdata;
  			if(data == null || data == 'undefined' || data.token == null || data.token == 'undefined'){
  				self.NOTIFICATIONS = [];
          self.updateStorage();
  			}else{
  				self.setUser(data);
  			}

  			self.init();
  		});
   	}
};

$(document).ready(function () {
  NIKONIKO.run();
});
