"use strict";

/**********************************************************/
/*                      Includes                          */
/**********************************************************/
var fn          = require("./functions.js"),
    fs          = require('fs'),
    file        = "./dictionary/888.js",
    http        = require("http"),
    https       = require("https"),
    Q           = require("q"),
    _           = require("underscore"),
    dictionary  = fn._readFile( file ),
    parseString = require('xml2js').parseString,
    log4js      = require('log4js');

/**********************************************************/
/*                      Variables                         */
/**********************************************************/
const ID_FEED = 12,
      NAME_FEED = '888';

log4js.configure({
  appenders: [
    { type: 'console' },
    //{ type: 'file', filename: 'logs/888.log', category: '888' }
  ]
});

var logger = log4js.getLogger('888');

fs.watch( file, (curr, prev) => 
{
    dictionary = fn._readFile( file );
});

var parser = module.exports.parser = function( json )
{
    //json = JSON.parse('{"events":[],"terms":[{"type":"ATTRIBUTE","id":"/in-play","termKey":"in-play","localizedName":"in-play","parentId":"","englishName":"in-play"}],"activeTermIds":["/in-play"],"soonMode":"MONTHLY","categories":[],"activeCategoryIds":[],"eventTypes":[],"activeEventTypes":[],"defaultEventType":"matches"}');

    var defer = Q.defer(),
        exit = [];

    function getDataMarkets( data, request )
    {
        if( data.betoffers && data.betoffers.length > 0 )
        {
            var markets = [];

            _.each( data.betoffers, function( betoffer )
            {
                var marketFeedName = betoffer.criterion.label + " - " + betoffer.betOfferType.name,
                    marketFeedData = {},
                    aParticipant = [];
                /* Buscamos el mercado */
                var fMarkets = _.find( request.markets, function( marketName )
                {
                    if( marketName.name != null )
                    {
                        if( marketName.name == marketFeedName )
                        {
                            logger.info("Se ha encontrado el mercado: ['" + marketFeedName + "']");

                            marketFeedData = {
                                id: marketName.id,
                                id_group: marketName.id_group,
                                feed: marketName.feed
                            };

                            _.filter( betoffer.outcomes, function( bet )
                            {
                                if( bet.label == 'X' )
                                {
                                    aParticipant.push({
                                        id: bet.id,
                                        name: 'Draw',
                                        odd: parseFloat( bet.odds / 1000 )
                                    });
                                }
                                else
                                {
                                    aParticipant.push({
                                        id: bet.id,
                                        name: (bet.label == '1') ? request.participants[0].name : request.participants[1].name,
                                        odd: parseFloat( bet.odds / 1000 )
                                    });
                                }
                            });

                             markets.push({
                                id: marketName.id,
                                id_group: marketName.id_group,
                                name: marketName.feed,
                                bets: aParticipant
                            });

                            return marketName;
                        }
                    }
                });

                if( fMarkets == undefined )
                    logger.warn("No se encuentra el mercado: ['" + marketFeedName + "']");
            });

            if( markets.length > 0)
            {
                exit.push({
                    sport: request.sport,
                    sportID: request.sportID,
                    league: request.league,
                    event: request.event,
                    info: request.info,
                    participants: request.participants,
                    markets: markets
                });  
            }

            return exit;
        }
    }

    function getMarkets( requests )
    {
        var defer = Q.defer(),
            ncall = 0;
            // rNumber = Math.round(Math.random() * (4 - 1)) + 1;


        _.each( requests, function( request )
        {
            function getRequest( request )
            {
                //console.log( request );

                var defer = Q.defer(),
                    rNumber = Math.round(Math.random() * (4 - 1)) + 1,
                    options = {
                        /* LLamada a mercados Luckia */
                        id: 7,
                        name: 'luckia',
                        host: 'e'+ rNumber +'-api.kambi.com',
                        protocol: 'https:',
                        port: 443,
                        path: '/offering/api/v2/888es/betoffer/live/event/'+request.id_event+'.json?market=ES&lang=es_ES&ncid=' + Date.now(),
                        agent: false,
                        secureOptions: require('constants').SSLv3_method
                    },
                    req = https.request( options, getCallRequest );

                //console.log( options.host + options.path );

                function getCallRequest( res )
                {   
                    var betoffers = '';

                    res.on('data', (chunk) =>
                    {
                        betoffers += chunk;
                    });

                    res.on('end', () =>
                    {
                        try
                        {
                            return defer.resolve( getDataMarkets( JSON.parse(betoffers), request ) );
                        }
                        catch(e)
                        {
                            console.log( betoffers );

                            return defer.reject( e );
                        }
                    });
                };

                req.on('error', (e) =>
                {
                    logger.fatal( 'problem with request: %s', e.message );

                    return defer.reject( e );
                });

                /* El feed no responde en 5s */
                // req.setTimeout(5000, () =>
                // {
                //     logger.fatal( 'Timeout in: %s', options.name );

                //     return defer.reject( { message: 'timeout', feed: options.name, id_feed: options.id } );
                // });

                req.end();

                return defer.promise;
            };

            _.delay( function()
            {
                getRequest( request )
                .then( function()
                {
                    ncall++;

                    if( ncall == requests.length )
                        return defer.resolve( exit );
                })
                .fail(function( e )
                {
                    logger.error( 'Error with market request: %s', e.message );

                    ncall++;

                    if( ncall == requests.length )
                        return defer.resolve( exit );
                });
            }, 250);

        });

        if( requests.length == 0 ) 
            return defer.resolve( exit );

        return defer.promise;
    };

    function getDataJson( data )
    {
        var defer = Q.defer(),
            exitRequest = [];
        try
        {
            var data = _.filter( data.events, function( token )
            {
                /* Comprobamos si existe el deporte */
                _.filter( dictionary, function( sport )
                {
                    //console.log( sport.name + " == " + token.event.sport );

                    if( sport.name != null && sport.name.trim().toLowerCase() == token.event.sport.trim().toLowerCase() )
                    {
                        /* Comprobamos si existe la liga */
                        var fLeague = _.find( sport.leagues, function( leagueName )
                        {
                            if( leagueName.feed != null && leagueName.handle == token.event.groupId )
                            {
                                logger.info("Se encontro la liga: ['" + token.event.sport + " - " + token.event.group + "']" );

                                var participantData = [],
                                    aParticipant = [],
                                    marketFeedData = {};
                                /* Comprobamos si existe el participante */
                                var fParticipants = _.filter( sport.participants, function( participantName )
                                {
                                    // console.log( participantName.name + " == " + token.event.homeName );
                                    // console.log( participantName.name + " == " + token.event.awayName );

                                    if( participantName.name != null && participantName.feed != null )
                                    {
                                        if( token.event.homeName && participantName.name.trim().toLowerCase() == token.event.homeName.trim().toLowerCase() )
                                        {
                                            logger.info("Se ha encontrado el participante: ['" + token.event.homeName + "']");

                                             participantData[0] = {
                                                id  : participantName.id,
                                                name: token.event.homeName,
                                                feed: participantName.feed,
                                                img : participantName.img
                                            };

                                            return participantName;
                                        }
                                        else if( token.event.awayName && participantName.name.trim().toLowerCase() == token.event.awayName.trim().toLowerCase() )
                                        {
                                            logger.info("Se ha encontrado el participante: ['" + token.event.awayName + "']");

                                             participantData[1] = {
                                                id  : participantName.id,
                                                name: token.event.awayName,
                                                feed: participantName.feed,
                                                img : participantName.img
                                            };

                                            return participantName;
                                        }
                                    }
                                });

                                if( fParticipants.length > 1 && participantData.length == 2 )
                                {
                                    logger.info("Se han encontrado participantes suficientes para crear el evento.");

                                    var liveData = ( token.liveData ) ? token.liveData : undefined;

                                    console.log( liveData );

                                    exitRequest.push({
                                        sport: sport.type,
                                        sportID: sport.id,
                                        league: leagueName.feed,
                                        id_event: token.event.id,
                                        event: participantData[0].feed + " vs " + participantData[1].feed,
                                        info: {
                                            startTime: new Date( token.event.start ),
                                            score: ( liveData != undefined && typeof(liveData.score.home) != 'undefined' && typeof(liveData.score.away) != 'undefined') ? liveData.score.home + " : " + liveData.score.away : ' : ',
                                            set: (function( liveData )
                                            {
                                                var set = [];

                                                if( liveData != undefined && typeof(liveData.statistics) != 'undefined' )
                                                {
                                                    var stats = null;

                                                    switch( sport.id )
                                                    {
                                                        case 1:
                                                            if( liveData.statistics.setBasedStats )
                                                                stats = liveData.statistics.footballStats;
                                                            else if( liveData.statistics.football )
                                                                stats = liveData.statistics.football;
                                                        break;
                                                        case 3:
                                                            if( liveData.statistics.setBasedStats )
                                                                stats = liveData.statistics.setBasedStats;
                                                            else if( liveData.statistics.sets )
                                                                stats = liveData.statistics.sets;                                                      
                                                        break;
                                                    }
                                               
                                                    if( stats != null && typeof(stats.home) != 'undefined' &&  typeof(stats.away) != 'undefined' )
                                                    {
                                                        for( var nCont = 0, len = stats.home.length;
                                                             nCont < len;
                                                             nCont++ )
                                                        {
                                                            if( stats.home[nCont] != -1 && stats.away[nCont] != -1 )
                                                                set.push(stats.home[nCont]+':'+stats.away[nCont]);
                                                        }
                                                    }
                                                }

                                                return set;

                                            })( liveData ),
                                            hserving: (sport.id == 3 && liveData != undefined && typeof(liveData.statistics.sets.homeServe) != 'undefined') ? liveData.statistics.sets.homeServe ? true : false : null,
                                            status: '',
                                            gametime: liveData != undefined ? (parseInt(liveData.matchClock.minute)+1)+"'" : null
                                        },
                                        participants: _.map(participantData, function( data )
                                        {
                                            return {
                                                id  : data.id,
                                                name: data.feed,
                                                img : data.img
                                            }
                                        }),
                                        markets: sport.markets
                                    });
                                }
                                else
                                {
                                    logger.warn("No se encuentran participantes suficientes para el evento: ['" + token.event.name + "']");
                                }

                                return leagueName;
                            }
                        });

                        if( fLeague == undefined )
                        {
                            logger.warn("No se encuentra la liga: ['" + token.event.sport + " - " + token.event.group + "']");
                        }
                    }
                }, []);

                return defer.resolve( exitRequest );
            });

            if( exitRequest.length == 0 )
            {
                setTimeout( function()
                {
                    return defer.resolve( exitRequest );
                }, 250)
            }
        }
        catch( err )
        {
            logger.fatal("error catch: " + err);
            return defer.reject(err);
        }

        return defer.promise;
    };

    getDataJson( json )
        .then( function( result )
        {
            return getMarkets( result );
        })
        .then( function( data )
        {
            //console.log( exit );

            var aData = {
                feedID: ID_FEED,
                feed: NAME_FEED,
                data: exit
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