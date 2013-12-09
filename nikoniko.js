
var NIKONIKO = {
	ENV_URL: 'http://nikoniko.co/',
	USER_DATA: null,
	ACTIVE_PAGE: null,
	ACTIVE_TEAM: null,
	STORAGE: chrome.storage.local,
	REQUEST: null,

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
			'active_page': this.getActivePage()
		};

		this.STORAGE.set(data, function(){
			console.log('Saved to storage');
		});
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
   		if(this.getToken() == ''){
   			return this.ENV_URL + page;
   		}else{
   			return this.ENV_URL + page + '?token=' + this.getToken();
   		}
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
   		$('#messages').html(text).show(1000).delay(2000).hide(500);
   	},

   	signOut: function(){
   		this.setUser(null);
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
	   			}else{
	   				self.showMessage('Authorized!');
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
   			url:  self._url('users/' + self.getActiveTeam() + '/get_questions'),
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
   		});
   	},

   	init: function(){
   		if(this.isGuest()){
   			this.showSignIn();
   		}else{
   			if(this.getActivePage() == 'questions'){
   				this.showQuestions();
   			}else{
   				this.showTeams();
   			}
   		}
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
			data = r.userdata;
			if(data == null || data == 'undefined' || data.token == null || data.token == 'undefined'){
				;
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
