"use strict";

/**********************************************************/
/*                      Includes                          */
/**********************************************************/
var fn          = require("./functions.js"),
    fs          = require('fs'),
    file        = "./dictionary/betfair.js",
    Q           = require("q"),
    //watch       = require("node-watch"),
    _           = require("underscore"),
    dictionary  = fn._readFile( file ),
    parseString = require('xml2js').parseString;

/**********************************************************/
/*                      Variables                         */
/**********************************************************/
const ID_FEED = 10,
      NAME_FEED = 'Betfair';

var nSport = new Array();
    nSport['Soccer']  = 1;        // Football

fs.watch( file, (curr, prev) => 
{
  dictionary = fn._readFile( file );
});

var parser = module.exports.parser = function( xml )
{
    var defer = Q.defer();

    function parserXML( xml )
    {
        var defer = Q.defer();

        parseString( xml, function (err, result) 
        {
            return err ? defer.reject(new Error("Archivo No Leído")) : defer.resolve(result);
        });

        return defer.promise;
    };

    function getDataJson( json )
    {
        try
        {
            var exit = [],
                data = _.filter( json, function( group )
                {
                    var sportType = nSport[group.$.sport];

                    //console.log( sportType );
                    /* Comprobamos si existe el deporte */
                    _.find( dictionary, function( sport )
                    {
                        //console.log( sport.id + " == " + sportType );
                        /* Comprobamos que tengamos el deporte */
                        if( sport.id == sportType )
                        {
                            _.filter( group.events, function( events )
                            {
                                _.filter( events.event, function( event )
                                {
                                    var participantData = [],
                                        marketsData = [],
                                        auxNameEvnt = event.$.name.split(" v ");

                                    /* Comprobamos si existe el participante */
                                    var fParticipant = _.filter( sport.participants, function( participantName )
                                    {
                                        //console.log( participantName.name + " == " + auxNameEvnt);

                                        if( participantName.len == auxNameEvnt[0].length && participantName.name == auxNameEvnt[0] )
                                        {
                                            participantData[0] = {
                                                name: participantName.name,
                                                feed: participantName.feed
                                            };

                                            return participantName;
                                        }
                                        else if( participantName.len == auxNameEvnt[1].length && participantName.name == auxNameEvnt[1] )
                                        {
                                            participantData[1] = {
                                                name: participantName.name,
                                                feed: participantName.feed
                                            };

                                            return participantName;
                                        }
                                    });

                                    /* Si encontramos participantes suficientes para crear el evento */
                                    if( fParticipant.length > 0 && fParticipant.length == participantData.length )
                                    {
                                        _.find( event.markets, function( markets )
                                        {
                                            _.find( markets.market, function( market )
                                            {
                                                /* Comprobamos que exista el mercado */
                                                var fmarket = _.find( sport.markets, function( marketName )
                                                {
                                                    //console.log( marketName.name + " == " + market.$.name );
                                                    if( marketName.name == market.$.name )
                                                    {
                                                        var aParticipant = [];

                                                        _.filter( market.selections, function( selections )
                                                        {
                                                            _.filter( selections.selection, function( selection )
                                                            {
                                                                if( selection.$.name == "Draw" )
                                                                {
                                                                    aParticipant.push({
                                                                        id: selection.$.selectionId,
                                                                        name: 'Draw',
                                                                        odd: selection.$.decimalOdds
                                                                    });
                                                                }
                                                                else
                                                                {
                                                                    aParticipant.push({
                                                                        id: selection.$.selectionId,
                                                                        name: selection.$.name,
                                                                        odd: selection.$.decimalOdds
                                                                    });
                                                                }
                                                            });
                                                        });

                                                        if( market.selections[0].selection.length == aParticipant.length )
                                                        {
                                                            marketsData.push({
                                                                id: marketName.id,
                                                                id_group: marketName.id_group,
                                                                name: marketName.feed,
                                                                bets: aParticipant
                                                            });
                                                        }


                                                        return marketName;
                                                    }
                                                });

                                                if( fmarket != undefined )
                                                    return market;

                                            });
                                        }); 
                                    }

                                    if( marketsData.length > 0 && participantData.length > 0 )
                                    {
                                        exit.push({
                                            sport: sport.type,
                                            sportID: sport.id,
                                            league: null,
                                            event: participantData[0].feed + " vs " + participantData[1].feed,
                                            participants: _.map(participantData, function( data )
                                            {
                                                return data.feed;
                                            }),
                                            markets: marketsData
                                        });
                                    }

                                });
                                
                            });

                            return sport;
                        }
                    });

                }, []);

            return exit;

        }
        catch( err )
        {
            logger.fatal("error: " + err);

            return [];
        }
    };

    parserXML( xml )
        .then( function( result )
        {
            var json = typeof( result.data.competition ) != 'undefined' 
                   ? result.data.competition : [];

            return getDataJson( json );
        })
        .then( function( data )
        {
            var aData = {
                feedID: ID_FEED,
                feed: NAME_FEED,
                data: data
            }
            //console.log( JSON.stringify(aData) );
            
            return defer.resolve( aData );
        })
        .fail( function( err )
        {
            logger.fatal("error: " + err);
            return defer.reject(err.message);
        });

    return defer.promise;
}; 