import React, { Component } from 'react';
import yawp from 'yawp';
import { FB } from 'fb-es5';
import * as firebase from 'firebase';
import $ from 'jquery';

import SpotBox from '../components/SpotBox';
import Spinner from '../components/Spinner';

import '../css/Admin.css';

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
    logging: false,
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
      this.setState({ spots: response.reverse(), token: idToken });
    }.bind(this));
  }

  printSpots()
  {
    let spotsDivs =[];
    this.state.spots.forEach(spot => spotsDivs.push(
      <SpotBox
        key={spot.id}
        approveSpot={() => this.approveSpot(spot.id, spot.message)} 
        rejectSpot={() => this.rejectSpot(spot.id)}
        {...spot}
        date={new Date(spot.date)}
        admin
      />
    ));
    
    return spotsDivs;
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

  login = () =>
  {
    let email = document.getElementById("email").value,
        pass  = document.getElementById("pass").value;
    
    this.setState({
      logging: true
    });
    firebase.auth().signInWithEmailAndPassword(email, pass)
      .then(() => {
        this.setState({
          logged: true,
          logging: false
        });
      })
      .catch(e => {
        console.log(e.message);
        this.setState({
          logging: false
        });
      });
  }

  logout()
  {
    firebase.auth().signOut();
    this.setState({
      logged: false
    });
  }

  render() 
  {
    if (this.state.logged)
      return (
        <div className="content admin">
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
        <div className="content admin centralize">
          <input type="text" id="email" name="email" placeholder="Email"/>
          <input type="password" id="pass" name="pass" placeholder="Senha"/>
          <button className="btn" onClick={this.login}>
            Entrar
            <Spinner active={this.state.logging} color="#FFF"/>
          </button>
        </div>
      );
  }
}

export default Admin;
