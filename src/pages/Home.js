import React, { Component } from 'react';
import yawp from 'yawp';
import SpotBox from '../components/SpotBox';

import '../index.css';
import './Home.css';

import messageIcon from '../imgs/message.png';
import brokenHeartIcon from '../imgs/broken-heart.png';

class Home extends Component 
{
  constructor(props)
  {
    super(props);
    
    yawp.config(function (c) {
      c.baseUrl(props.serverUrl);
    });
    
    this.selectSpots();
  }
  
  state =
  {
    spots: [],
    loaded: false,
    error: false,
  }

  selectSpots()
  {
    yawp('/spots/approved').list(l => this.setState({spots: l, loaded: true})).catch(e => this.setState({loaded: true, error: true}));
  }

  printSpots()
  {
    let spotsDivs =[];
    this.state.spots.forEach(spot => spotsDivs.push(
      <SpotBox key={spot.id} {...spot} date={new Date(spot.date)}/>
    ));
    
    return spotsDivs;
  }

  render() 
  {
    return (
        <div id="content" className="content">
          { !this.state.loaded && <div className="loader"></div> }
          
          { 
            this.state.error && 
            <div className="error">
              <img className="brokenHeart" src={ brokenHeartIcon } alt="Broken Heart"></img>
              <div className="message">
                <strong>Oh, não!</strong>
                <br/><br/>
                  Algo deu errado ao tentar pegar os spots, por favor, <a className="link" href="./">recarregue a página</a>.
                <br/><br/>
              </div>
            </div> 
          }
          
          { this.printSpots() }
          
          <a href="./#/send"><img alt="sendSpot" className="sendSpot" src={ messageIcon }/></a>
        </div>
    );
  }
}

export default Home;