import React, { Component } from 'react';
import yawp from 'yawp';
import { FB } from 'fb-es5';
import * as firebase from 'firebase';
import $ from 'jquery';

import approveIcon from '../../imgs/approve.png';
import rejectIcon from '../../imgs/reject.png';

import '../../css/Admin.css';

var Twitter = require('twitter');

class Admin extends Component 
{
  tt = null;

  constructor(props)
  {
    super(props);
    
    yawp.config(function (c) {
      c.baseUrl(props.serverUrl);
    });
    
    firebase.initializeApp(props.firebase);
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) 
        user.getIdToken().then(function(idToken) { this.initializeSocials(idToken); this.selectSpots(idToken); }.bind(this));
    }.bind(this));
  };

  state =
  {
    spots: [],
    logged: false,
    token: '',
    consumer_key: '',
    consumer_secret: '',
    access_token_key: '',
    access_token_secret: '',
  }
  
  initializeSocials(idToken)
  {
    let settings = 
    {
      "async": true,
      "crossDomain": true,
      "url": this.props.serverUrl + "/admins/tokens",
      "method": "GET",
      "headers":
      {
        "Authorization": "Bearer " + idToken
      }
    };
    
    let context = this;
    $.ajax(settings).done(function (response) {
      FB.setAccessToken(response.fb_token_key);
    
      context.tt = new Twitter({
        consumer_key: response.tt_consumer_key,
        consumer_secret: response.tt_consumer_secret,
        access_token_key: response.tt_token_key,
        access_token_secret: response.tt_token_secret
      });
    });

    console.log(idToken);
  }
  
  selectSpots(idToken)
  {
    let settings = 
    {
      "async": true,
      "crossDomain": true,
      "url": this.props.serverUrl + "/spots/pending",
      "method": "GET",
      "headers":
      {
        "Authorization": "Bearer " + idToken
      }
    }
    
    $.ajax(settings).done(function (response) {
      this.setState({ spots: response.reverse(), logged: true, token: idToken });
    }.bind(this));
  }

  printSpots()
  {
    let spotsDivs =[];
    this.state.spots.forEach(spot => spotsDivs.push(this.createSpotBox(spot)));
    
    return spotsDivs;
  }

  createSpotBox(spot)
  {
    var serverDate = new Date(spot.date);
    var date = new Date(serverDate);
    date.setMinutes(serverDate.getMinutes() - serverDate.getTimezoneOffset());
    
    let d = date.getDate();
    let m = date.getMonth() + 1;
    
    let h = date.getHours();
    let min = date.getMinutes();
    
    return (
      <div className="spotBox"> 
        <p className="date">
          { 
            (d > 9 ? '' : '0') + d + '/' + (m > 9 ? '' : '0') + m + '/' + date.getFullYear() + ' - ' +
            (h > 9 ? '' : '0') + h + 'h' + (min > 9 ? '' : '0') + min
          }
        </p>
       
        { "\"" + spot.message + "\"" } 
        
        <hr/>
        
        <div className="spotBoxFooter">
          <img alt="approve" className="changeStatus" src={ approveIcon } onClick={ () => this.approveSpot(spot.id, spot.message) }></img>
          <img alt="reject" className="changeStatus" src={ rejectIcon } onClick={ () => this.rejectSpot(spot.id) }></img>
        </div>
      </div>
    );
  }

  approveSpot(id, spotMessage)
  {
    let settings = 
    {
      "async": true,
      "crossDomain": true,
      "url": this.props.serverUrl + id + "/approve",
      "method": "PUT",
      "headers":
      {
        "Authorization": "Bearer " + this.state.token
      }
    };
    
    let context = this;
    $.ajax(settings).done(function (response) 
    {
      FB.api('me/feed', 'post', { message: "\"" + spotMessage + "\"" }, function (res)
      {
        if(!res || res.error)
          return;

        settings.url = context.props.serverUrl + id + "/addPostId?fbPostId=" + res.id.split('_')[1];
        $.ajax(settings).done(r =>
        {
          let settings = {
            async: true,
            crossDomain: true,
            url: context.props.proxyUrl,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
              "accessSecret": context.tt.options.access_token_secret,
              "accessToken": context.tt.options.access_token_key,
              "consumerKey": context.tt.options.consumer_key,
              "consumerSecret": context.tt.options.consumer_secret,
              "message": "\"" + spotMessage + "\""
            })
          }

          $.ajax(settings).done(r =>
          {
            let settings = 
            {
              "async": true,
              "crossDomain": true,
              "url": context.props.serverUrl + id + "/addPostId?ttPostId=" + r.tweetId,
              "method": "PUT",
              "headers":
              {
                "Authorization": "Bearer " + context.state.token
              }
            };

            $.ajax(settings);
          })

          context.selectSpots(context.state.token);
        });
      });
    });
  }

  rejectSpot(id)
  {
    let settings = 
    {
      "async": true,
      "crossDomain": true,
      "url": this.props.serverUrl + id + "/reject",
      "method": "PUT",
      "headers":
      {
        "Authorization": "Bearer " + this.state.token
      }
    };
    
    $.ajax(settings).done(function (response) {
      this.selectSpots(this.state.token);
    }.bind(this));
  }

  login()
  {
    let email = document.getElementById("email").value,
        pass  = document.getElementById("pass").value;
    
    firebase.auth().signInWithEmailAndPassword(email, pass).catch(e => console.log(e.message));
  }

  logout()
  {
    firebase.auth().signOut();
    this.setState({logged: false});
  }

  render() 
  {
    if (this.state.logged)
      return (
        <div className="content">
          <div className="Logout-btn">
            <a href="./" onClick={this.logout}><b>Logout</b></a>
          </div>
          {
            this.printSpots()
          }
        </div>
      );
    else
      return (
        <div className="content">
          <div className="middle">
            <div className="form-content">
              <div className="row">
                <input type="text" id="email" name="email" placeholder="Email"/>
              </div>
              <div className="row">
                <input type="password" id="pass" name="pass" placeholder="Senha"/>
              </div>
              <div className="row">
                <button className="btn" onClick={ this.login }>Entrar</button>
              </div>
            </div>
          </div>
        </div>
      );
  }
}

export default Admin;
