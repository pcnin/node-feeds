"use strict";

/**********************************************************/
/*                      Includes                          */
/**********************************************************/
var fn          = require("./functions.js"),
    fs          = require('fs'),
    file        = "./dictionary/pinnacle.js",
    https       = require("https"),
    Q           = require("q"),
    _           = require("underscore"),
    dictionary  = fn._readFile( file ),
    parseString = require('xml2js').parseString,
    log4js      = require('log4js');

/**********************************************************/
/*                      Variables                         */
/**********************************************************/
const ID_FEED = 16,
      NAME_FEED = 'Pinnacle';

log4js.configure({
  appenders: [
    { type: 'console' },
    //{ type: 'file', filename: 'logs/pinnacle.log', category: 'pinnacle' }
  ]
});

var logger = log4js.getLogger('pinnacle');

fs.watch( file, (curr, prev) => 
{
    dictionary = fn._readFile( file );
});


/* PATHS */

/* Obtener los deportes */
/*
   https://api.pinnacle.com/v2/sports
*/
/* Obtener las ligas y los eventos */
/*
   https://api.pinnacle.com/v1/fixtures?sportid=29&islive=1
*/
/* Obtener cuotas de las ligas */
/*
   https://api.pinnacle.com/v1/odds?sportid=29&leaguesIds=9757&oddsFormat=DECIMAL&islive=1
*/

var parser = module.exports.parser = function( xml )
{
    var defer = Q.defer();

    function callPinnacle( path )
    {        
        var username = "AFF5036",
            password = "Besgam94@",
            options = {
                /* Pinnacle */
                id: 16,
                name: 'pinnacle',
                host: 'api.pinnacle.com',
                protocol: 'https:',
                port: 443,
                path: path,
                auth: 'Basic QUZGNTAzNjpCZXNnYW05NEA=',
                headers: {
                    'Content-length' : 0,
                    'Content-Type'   : 'application/json',
                    'Authorization'  : 'Basic QUZGNTAzNjpCZXNnYW05NEA='
                }
            },
            deferred = Q.defer(),
            request  = https.request(options, function(res)
            {
                var  strData = '';

                res.on('data', function (chunk) 
                {
                    strData += chunk;
                });

                res.on('end', function () 
                {
                    var readData = {};

                    try
                    {
                        if( strData !== '' )
                            readData = JSON.parse( strData );
                    }
                    catch(error)
                    {
                        console.log( "Error en llamada: (%s)", error );
                    }
                    finally
                    {
                        return deferred.resolve(readData);
                    }
                });
                
                res.on('error', function(error)
                {
                    deferred.reject(error);
                });
            });

        request.end();

        /* La llamada provoca un error */
        request.on('error', (e) =>
        {
            logger.fatal( 'problem with request: %s', e.message );

            return deferred.reject( { type: 'error', men: 'problem with request: ' + e.message } );
        });
        /* El feed no responde en 5s */
        request.setTimeout(5000, () =>
        {
            logger.fatal( 'Timeout in: %s', options.name );

            return deferred.reject( { type: 'timeout', feed: options.name, id_feed: options.id } );
        });
         
        return deferred.promise;
    }

    function callOdds( events, sport )
    {
        var defer = Q.defer(),
            PATH_INIT = '/v1/odds?sportid=',
            PATH_FINISH = '&oddsFormat=DECIMAL&islive=1',
            path = PATH_INIT + sport.idPinnacle + PATH_FINISH;

        /* Obtenemos las cuotas de pinnacle, */
        /* según el deporte pasado */
        callPinnacle( path )
            .then( function( result )
            {
                //console.log( result );

                var data = [];

                _.each( result.leagues, function( leagueData )
                {
                    _.filter( events, function( event )
                    {
                        if( event.idLeague === leagueData.id )
                        {
                            console.log( event.league );

                            var fFind = _.find( leagueData.events, function( eventData )
                            {
                                if( eventData.id === event.idEvent )
                                {
                                    console.log( "event: %s", event.event );

                                    var marketsPinnacle = [],
                                        markets = [];

                                    //console.log( eventData.periods );
                                    _.each( eventData.periods, function( period )
                                    {
                                        /* Basketball(4) */         /* Soccer(29) */        /* Tennis(33) */
                                        // 0 -> Game                // 0 -> Match           // 0 -> Match
                                        // 1 -> 1st Half            // 1 -> 1st Half        // 1 -> 1st Set Winner
                                        // 2 -> 2nd Half            // 2 -> 2nd Half        // 2 -> 2nd Set Winner
                                        // 3 -> 1st Quarter                                 // 3 -> 3rd Set Winner
                                        // 4 -> 2nd Quarter                                 // 4 -> 4th Set Winner
                                        // 5 -> 3rd Quarter                                 // 5 -> 5th Set Winner
                                        // 6 -> 4th Quarter

                                        var typePeriod = period.number;

                                        switch( period.number )
                                        {
                                            case 0:
                                                if( sport.id === 2 )
                                                    typePeriod = "Game";
                                                else
                                                    //typePeriod = "Match";
                                                    typePeriod = "fin partido";
                                            break;
                                            case 1:
                                                if( sport.id === 3 )
                                                    typePeriod = "1st Set Winner";
                                                else
                                                    typePeriod = "1st Half";
                                            break;
                                            case 2:
                                                if( sport.id === 3 )
                                                    typePeriod = "2nd Set Winner";
                                                else
                                                    typePeriod = "2nd Half";
                                            break;
                                            case 3:
                                                if( sport.id === 2 )
                                                    typePeriod = "1st Quarter";
                                                else if( sport.id === 3 )
                                                    typePeriod = "3rd Set Winner";
                                            break;
                                            case 4:
                                                if( sport.id === 2 )
                                                    typePeriod = "2nd Quarter";
                                                else if( sport.id === 3 )
                                                    typePeriod = "4th Set Winner";
                                            break;
                                            case 5:
                                                if( sport.id === 2 )
                                                    typePeriod = "3rd Quarter";
                                                else if( sport.id === 3 )
                                                    typePeriod = "5th Set Winner";
                                            break;
                                            case 5:
                                                if( sport.id === 2 )
                                                    typePeriod = "4th Quarter";
                                            break;
                                            default:
                                                typePeriod = period.number;
                                            break;
                                        }

                                        /* Resultado del partido */
                                        if( typeof period.moneyline != "undefined" )
                                        {
                                            marketsPinnacle.push({
                                                name: "Money Line " + typePeriod,
                                                home: period.moneyline.home,
                                                away: period.moneyline.away,
                                                draw: period.moneyline.draw || null
                                            });
                                        }
                                    });
    
                                    /* Segun los mercado que hemos encontrado */
                                    _.each( marketsPinnacle, function( marketPinnacle )
                                    {
                                        /* Buscamos el mercado */
                                        var fMarkets = _.find( sport.dictionarySport.markets, function( marketName )
                                        {
                                            if( marketName.name != null )
                                            {
                                                console.log( marketName.name + " == " + marketPinnacle.name );
                                                if( marketName.name == marketPinnacle.name )
                                                {
                                                    logger.info("Se ha encontrado el mercado: ['" + marketName.name + "']");

                                                    var bets = [];

                                                    if( marketPinnacle.draw != null )
                                                    {
                                                        bets.push({
                                                            id  : 0,
                                                            name: 'Draw',
                                                            tip : 'X',
                                                            odd : marketPinnacle.draw
                                                        });
                                                    }
                                                    if( marketPinnacle.home != null )
                                                    {
                                                        bets.push({
                                                            id  : 0,
                                                            name: event.participants[0].name,
                                                            tip : '1',
                                                            odd : marketPinnacle.home
                                                        });
                                                    }
                                                    if( marketPinnacle.away != null )
                                                    {
                                                        bets.push({
                                                            id  : 0,
                                                            name: event.participants[1].name,
                                                            tip : '2',
                                                            odd : marketPinnacle.away
                                                        });
                                                    }

                                                     markets.push({
                                                        id: marketName.id,
                                                        id_group: marketName.id_group,
                                                        name: marketName.feed,
                                                        bets: bets
                                                    });

                                                    return markets;
                                                }
                                            }
                                        });

                                        if( fMarkets == undefined )
                                            logger.warn("No se encuentra el mercado: ['" + marketPinnacle.name + "']");
                                    });

                                    if( markets.length > 0)
                                    {
                                        data.push({
                                            league: event.league,
                                            event: event.event,
                                            info: event.info,
                                            participants: event.participants,
                                            markets: markets
                                        });  
                                    }
                                }
                            });
                        }
                    });
                });

                return defer.resolve( data );
            })
            .fail( function( err )
            {
                logger.fatal(err);
                //return defer.reject(err);

                return defer.resolve( data );
            });

        return defer.promise;
    };

    function callLeagues( sportID, dictionarySport )
    {
        var defer = Q.defer(),
            PATH_INIT = '/v1/fixtures?sportid=',
            PATH_FINISH = '&islive=1',
            path = PATH_INIT + sportID + PATH_FINISH;

        /* Obtenemos las ligas de pinnacle, */
        /* según el deporte pasado */
        callPinnacle( path )
            .then( function( result )
            {
                var data = [],
                    participantData = [];

                _.each( result.league, function( leagueData )
                {
                    /* Comprobamos si existe la liga */
                    _.filter( dictionarySport.leagues, function( pinnacleLeague )
                    {
                        if( pinnacleLeague.handle === leagueData.id )
                        {
                            //console.log( pinnacleLeague.handle + " === " + leagueData.id );
                            _.each( leagueData.events, function( event )
                            {
                                // if( event.status !== 'H')
                                // {
                                    /* Buscamos sus participantes */
                                    var fParticipant = _.filter( dictionarySport.participants, function( participantName )
                                    {
                                        if( participantName.name != null )
                                        {
                                            if( participantName.name.trim().toLowerCase() == event.home.trim().toLowerCase() )
                                            {
                                                participantData[0] = {
                                                    id  : participantName.id,
                                                    name: participantName.name,
                                                    feed: participantName.feed,
                                                    img : participantName.img
                                                };

                                                logger.info("Se ha encontrado el participante: ['" + participantName.name + "']");

                                                return participantName;
                                            }
                                            else if( participantName.name.trim().toLowerCase() == event.away.trim().toLowerCase() )
                                            {
                                                participantData[1] = {
                                                    id  : participantName.id,
                                                    name: participantName.name,
                                                    feed: participantName.feed,
                                                    img : participantName.img
                                                };

                                                logger.info("Se ha encontrado el participante: ['" + participantName.name + "']");

                                                return participantName;
                                            }
                                        }

                                    });

                                    if( fParticipant.length > 1 )
                                    {
                                        logger.info("Se han encontrado participantes suficientes para crear el evento.");

                                        data.push({
                                            league  : pinnacleLeague.feed,
                                            idLeague: leagueData.id,
                                            event   : participantData[0].feed + " vs " + participantData[1].feed,
                                            idEvent : event.id,
                                            info    : {},
                                            participants: _.map(participantData, function( data )
                                            {
                                                return {
                                                    id  : data.id,
                                                    name: data.feed,
                                                    img : data.img
                                                }
                                            }),
                                            markets: []
                                        });
                                    }
                                    else
                                    {
                                        logger.warn("No se encuentran participantes suficientes para el evento: ['" + event.home + ' vs ' + event.away + "']");
                                    }
                                // }
                            });
                            
                        }

                    }, []);

                    return defer.resolve( data );
                });
            })
            .fail( function( err )
            {
                // logger.fatal("error: " + err);
                // return defer.reject(err.message);

                logger.fatal(err);
                return defer.resolve( data );
            });

        return defer.promise;
    };

    function parserSports( json )
    {
        var defer = Q.defer(),
            sports = [];

        _.each( json.sports, function( sport )
        {
            _.find(dictionary, function( pinnacleSport )
            {
                if( sport.name === pinnacleSport.name )
                {
                    sports.push({
                        idPinnacle: sport.id,
                        type: pinnacleSport.type,
                        id: pinnacleSport.id,
                        dictionarySport: pinnacleSport
                    });
                }
            })

            return defer.resolve( sports );
        });

        return defer.promise;
    };

    parserSports( xml )
        .then( function( sports )
        {
            return Q.all( _.map( sports, function( sport )
            {
                var defer = Q.defer();

                callLeagues( sport.idPinnacle, sport.dictionarySport )
                .then( function( result )
                {
                    /* Recuperamos las apuestas */
                    return callOdds( result, sport );
                })
                .then( function( result )
                {
                    var exit = []; 

                    _.each( result, function( data )
                    {
                        exit.push({
                            sport  : sport.type,
                            sportID: sport.id,
                            league : data.league,
                            event  : data.event,
                            info   : data.info,
                            participants: data.participants,
                            markets: data.markets
                        });
                    });

                    return defer.resolve( exit );
                });

                return defer.promise;
            }) );            
        })
        .then( function( items )
        {
            var data = [];

            /* Nos devuelve los items por deporte */
            _.each( items, function( item )
            {
                _.each( item, function(event )
                {
                    /* Unimos todos los items */
                    data.push( event );
                });
            });

            /* Creamos su extructura */
            var aData = {
                feedID: ID_FEED,
                feed: NAME_FEED,
                data: data
            }

            return defer.resolve( aData );
        })
        .fail( function( err )
        {
            logger.fatal("error: " + err);
            return defer.reject(err.message);
        });

    return defer.promise;
}; 