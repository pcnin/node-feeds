"use strict";

/**********************************************************/
/*                      Includes                          */
/**********************************************************/
var fn          = require("./functions.js"),
    fs          = require('fs'),
    file        = "./dictionary/interwetten.js",
    Q           = require("q"),
    _           = require("underscore"),
    dictionary  = fn._readFile( file ),
    parseString = require('xml2js').parseString,
    log4js      = require('log4js');

//logger.setLevel('ERROR');
 
// logger.trace('Entering cheese testing');
// logger.debug('Got cheese.');
// logger.info('Cheese is Gouda.');
// logger.warn('Cheese is quite smelly.');
// logger.error('Cheese is too ripe!');
// logger.fatal('Cheese was breeding ground for listeria.');


/**********************************************************/
/*                      Variables                         */
/**********************************************************/
const ID_FEED = 5,
      NAME_FEED = 'Interwetten';

log4js.configure({
  appenders: [
    { type: 'console' },
    //{ type: 'file', filename: 'logs/interwetten.log', category: 'interwetten' }
  ]
});

var logger = log4js.getLogger('interwetten');

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
                data = _.filter( json, function( EVENT )
                {
                    /* Comprobamos si existe el deporte */
                    _.find( dictionary, function( sport )
                    {
                        /* Comprobamos que tengamos el deporte */
                        if( sport.name == EVENT.$.LIVE_KOSNAME )
                        {
                            /* Comprobamos si existe la liga */
                            var fLeague = _.find( sport.leagues, function( leagueName )
                            {
                                //console.log( leagueName.name + " == " + EVENT.$.LEAGUE_NAME );
                                //console.log( leagueName.handle + " == " + EVENT.$.LEAGUEID );
                                if( leagueName.handle == EVENT.$.LEAGUEID )
                                {
                                    logger.info("Se encontro la liga: ['" + EVENT.$.LEAGUE_NAME + "']" );

                                    var participantData = [],
                                        participantArray = [],
                                        fParticipant = undefined,
                                        auxNameEvnt = EVENT.$.NAME.split(" - "),
                                        dataCorrect = false,
                                        finfo = (function( score )
                                        {
                                            //SCORE="Game=5 : 6|Sets=0 : 0|Set 1=5 : 6|InGame=Adv : |Tiebreak=0 : 0|#Serving=0"
                                            //SCORE="SoccerGoal=2 : 0|Half 1=0 : 0|Half 2=2 : 0|Yellow Card=1 : 6"

                                            var tokens = score.split("|"),
                                                game = null,
                                                sets = null,
                                                set = [],
                                                score = null,
                                                hserving = null,
                                                ycard = null,
                                                rcard = null;

                                            for( var nCont = 0, len = tokens.length;
                                                 nCont < len;
                                                 nCont++ )
                                            {
                                                var token = tokens[nCont].split("=");
                                                    
                                                switch( token[0] )
                                                {
                                                    case "Game":
                                                        game = token[1];
                                                    break;
                                                    case "Sets":
                                                        sets = token[1];
                                                    break;
                                                    case "Set 1":
                                                        set.push( token[1] );
                                                    break;
                                                    case "Set 2":
                                                        set.push( token[1] );
                                                    break;
                                                    case "Set 3":
                                                        set.push( token[1] );
                                                    break;
                                                    case "Set 4":
                                                        set.push( token[1] );
                                                    break;
                                                    case "Set 5":
                                                        set.push( token[1] );
                                                    break;
                                                    case "InGame":
                                                        score = token[1];
                                                    break;
                                                    case "SoccerGoal":
                                                        score = token[1];
                                                    break;
                                                    case "#Serving":
                                                        hserving = token[1] == 0 ? true : false;
                                                    break;
                                                    case "Yellow Card":
                                                        ycard = token[1];
                                                    break;
                                                    case "Red Card":
                                                        rcard = token[1];
                                                    break;
                                                }
                                            };

                                            return {
                                                game: game,
                                                sets: sets,
                                                set: set,
                                                score: score,
                                                hserving: hserving,
                                                ycard: ycard,
                                                rcard: rcard,
                                            }
                                        })( EVENT.$.SCORE ),
                                        info = {
                                            startTime: EVENT.$.START_TIME,
                                            gameTime: EVENT.$.GAMETIME || null,
                                            score: finfo.score,
                                            game: finfo.game,
                                            sets: finfo.sets,
                                            set: finfo.set,
                                            hserving: finfo.hserving,
                                            ycard: finfo.ycard,
                                            rcard: finfo.rcard,
                                            status: EVENT.$.STATUS
                                        },
                                        markets = [],
                                        log = [];

                                    _.filter( EVENT.LOG, function( LOG )
                                    {
                                        _.filter( LOG.ENTRY, function( entry )
                                        {
                                            log.push({
                                                id: entry.$.ID,
                                                state: entry.$.STATE,
                                                type: entry.$.TYPE,
                                                seconds: entry.$.SECONDS,
                                                time: entry.$.DISPLAYTIME,
                                                message: entry.$.MESSAGE
                                            })
                                        });
                                    });

                                    /* Comprobamos partido de dobles de tenis */
                                    if( sport.id == 3 && auxNameEvnt[0].split(" / ").length > 1 && auxNameEvnt[1].split(" / ").length > 1 )
                                    {
                                        var participantDouble = auxNameEvnt[0].split(" / ").concat( auxNameEvnt[1].split(" / ") );

                                        var fdouble = _.filter( participantDouble, function( doubleName )
                                        {
                                            /* Comprobamos si existe el participante */
                                            fParticipant = _.filter( sport.participants, function( participantName )
                                            {
                                                if( participantName.name != null && participantName.name.trim().toLowerCase() == doubleName.trim().toLowerCase() )
                                                {
                                                    logger.info("Se ha encontrado el participante: ['" + participantName.name + "']");

                                                    if( participantName.name.trim().toLowerCase() == participantDouble[0].trim().toLowerCase() )
                                                    {
                                                        participantArray[0] = {
                                                            id  : participantName.id,
                                                            name: participantName.name,
                                                            feed: participantName.feed,
                                                            img : participantName.img
                                                        };
                                                    }
                                                    else if( participantName.name.trim().toLowerCase() == participantDouble[1].trim().toLowerCase() )
                                                    {
                                                        participantArray[1] = {
                                                            id  : participantName.id,
                                                            name: participantName.name,
                                                            feed: participantName.feed,
                                                            img : participantName.img
                                                        };
                                                    }
                                                    else if( participantName.name.trim().toLowerCase() == participantDouble[2].trim().toLowerCase() )
                                                    {
                                                        participantArray[2] = {
                                                            id  : participantName.id,
                                                            name: participantName.name,
                                                            feed: participantName.feed,
                                                            img : participantName.img
                                                        };
                                                    }
                                                    else
                                                    {
                                                        participantArray[3] = {
                                                            id  : participantName.id,
                                                            name: participantName.name,
                                                            feed: participantName.feed,
                                                            img : participantName.img
                                                        };
                                                    }

                                                    return participantName;
                                                }
                                            });

                                            if( fParticipant.length > 0 )
                                                return doubleName;

                                        });

                                        if( fdouble.length == 4 )
                                        {
                                            var participantNameDouble = {};

                                            if( participantArray[0].name.trim().toLowerCase() + " / " + participantArray[1].name.trim().toLowerCase() == auxNameEvnt[0].trim().toLowerCase() )
                                            {
                                                participantNameDouble = {
                                                    id  : [ participantArray[0].id, participantArray[1].id ],
                                                    name: participantArray[0].name + " / " + participantArray[1].name,
                                                    feed: participantArray[0].feed + " / " + participantArray[1].feed,
                                                    img : participantArray[0].img
                                                };

                                                participantData[0] = {
                                                    id  : participantNameDouble.id,
                                                    name: participantNameDouble.name,
                                                    feed: participantNameDouble.feed,
                                                    img : participantNameDouble.img
                                                };
                                            }
                                            
                                            if( participantArray[2].name.trim().toLowerCase() + " / " + participantArray[3].name.trim().toLowerCase() == auxNameEvnt[1].trim().toLowerCase() )
                                            {
                                                participantNameDouble = {
                                                    id  : [ participantArray[2].id, participantArray[3].id ],
                                                    name: participantArray[2].name + " / " + participantArray[3].name,
                                                    feed: participantArray[2].feed + " / " + participantArray[3].feed,
                                                    img : participantArray[2].img
                                                };

                                                participantData[1] = {
                                                    id  : participantNameDouble.id,
                                                    name: participantNameDouble.name,
                                                    feed: participantNameDouble.feed,
                                                    img : participantNameDouble.img

                                                };
                                            }

                                            fParticipant = fdouble;
                                        }
                                    }
                                    else
                                    {
                                        /* Comprobamos si existe el participante */
                                        fParticipant = _.filter( sport.participants, function( participantName )
                                        {
                                            //console.log( participantName.name + " == " + auxNameEvnt);
                                            //console.log( participantName.len + " == " + auxNameEvnt[1].length + " && " + participantName.name + " == " + auxNameEvnt[1] );

                                            if( participantName.name != null )
                                            {
                                                if( participantName.name.trim().toLowerCase() == auxNameEvnt[0].trim().toLowerCase() )
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
                                                else if( participantName.name.trim().toLowerCase() == auxNameEvnt[1].trim().toLowerCase() )
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
                                    }
                                    
                                    /* Si encontramos participantes suficientes para crear el evento */
                                    if( fParticipant.length > 1 && participantData.length > 1 )
                                    {
                                        logger.info("Se han encontrado participantes suficientes para crear el evento.");

                                        _.filter( EVENT.TG, function( market )
                                        {
                                            _.filter( market.GROUP, function( group )
                                            {
                                                var marketGroup = market.$.NAME + " - " + group.$.TYPENAME;

                                                var fMarkets = _.find( sport.markets, function( marketName )
                                                {
                                                    if( marketName.name != null && marketName.name.trim().toLowerCase() == marketGroup.trim().toLowerCase() )
                                                    {
                                                        logger.info("Se ha encontrado el mercado: ['" + marketGroup + "']");

                                                        var aParticipant = [];

                                                        _.filter( group.OFFER, function( offer )
                                                        {
                                                            if( offer.$.TIP == 'X' )
                                                            {
                                                                aParticipant.push({
                                                                    id: EVENT.$.ID + "|" + offer.$.ID + "|" + group.$.ID,
                                                                    name: 'Draw',
                                                                    tip: offer.$.TIP,
                                                                    odd: offer.$.QUOTE/100
                                                                });
                                                            }
                                                            else
                                                            {
                                                                if( offer.$.TIP == " " )
                                                                {
                                                                    aParticipant.push({
                                                                        id: EVENT.$.ID + "|" + offer.$.ID + "|" + group.$.ID,
                                                                        name: offer.$.NAME,
                                                                        tip: offer.$.TIP,
                                                                        odd: offer.$.QUOTE/100
                                                                    });
                                                                }
                                                                else
                                                                {
                                                                    _.find( participantData, function( nameParticipant )
                                                                    {
                                                                        if( nameParticipant.name == auxNameEvnt[ parseInt(offer.$.TIP)-1 ] )
                                                                        {
                                                                            aParticipant.push({
                                                                                id: EVENT.$.ID + "|" + offer.$.ID + "|" + group.$.ID,
                                                                                name: nameParticipant.feed,
                                                                                tip: offer.$.TIP,
                                                                                odd: offer.$.QUOTE/100
                                                                            });

                                                                            return nameParticipant;
                                                                        }
                                                                    });
                                                                }
                                                            }
                                                        });

                                                        if( group.OFFER.length == aParticipant.length )
                                                        {
                                                            markets.push({
                                                                id: marketName.id,
                                                                id_group: marketName.id_group,
                                                                name: marketName.feed,
                                                                bets: aParticipant
                                                            });
                                                        }

                                                        return marketName;
                                                    }
                                                });

                                                if( fMarkets == undefined )
                                                {
                                                    logger.warn("No se encuentra el mercado: ['" + marketGroup + "']");
                                                }

                                            });
                                        });

                                        if( markets.length > 0 )
                                        {
                                            exit.push({
                                                sport: sport.type,
                                                sportID: sport.id,
                                                league: leagueName.feed,
                                                event: participantData[0].feed + " vs " + participantData[1].feed,
                                                participants: _.map(participantData, function( data )
                                                {
                                                    return {
                                                        id  : data.id,
                                                        name: data.feed,
                                                        img : data.img
                                                    }
                                                }),
                                                info: info,
                                                log: log,
                                                markets: markets
                                            });
                                        }
                                        else
                                        {
                                            logger.warn("No se encuentra ningun mercado para el evento: ['" + EVENT.$.NAME + "']");
                                        }
                                    }
                                    else
                                    {
                                        logger.warn("No se encuentran participantes suficientes para el evento: ['" + EVENT.$.NAME + "']");
                                    }

                                    /* Si encontramos la liga salimos del bucle */
                                    return leagueName;
                                }
                            });

                            if( fLeague == undefined )
                            {
                                logger.warn("No se encuentra la liga: ['" + EVENT.$.LEAGUE_NAME + "']");
                            }

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
            var json = typeof( result.OFFERTREE.EVENT ) != 'undefined' 
                   ? result.OFFERTREE.EVENT : [];

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