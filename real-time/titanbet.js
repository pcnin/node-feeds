"use strict";

/**********************************************************/
/*                      Includes                          */
/**********************************************************/
var fn          = require("./functions.js"),
    fs          = require('fs'),
    file        = "./dictionary/titanbet.js",
    Q           = require("q"),
    _           = require("underscore"),
    dictionary  = fn._readFile( file ),
    parseString = require('xml2js').parseString,
    log4js      = require('log4js');

/**********************************************************/
/*                      Variables                         */
/**********************************************************/
const ID_FEED = 13,
      NAME_FEED = 'TitanBet';

log4js.configure({
  appenders: [
    { type: 'console' },
    //{ type: 'file', filename: 'logs/titanbet.log', category: 'titanbet' }
  ]
});

var logger = log4js.getLogger('titanbet');

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
                    /* Comprobamos si existe el deporte */
                    _.find( dictionary, function( sport )
                    {
                        //console.log( sport.type + " == " + group.$.sport_code );
                        /* Comprobamos que tengamos el deporte */
                        if( sport.type == group.$.sport_code )
                        {
                            _.filter( group.SBClass, function( sbclass )
                            {
                                _.filter( sbclass.SBType, function( type )
                                {
                                    /* Comprobamos si existe la liga */
                                    var fLeague = _.find( sport.leagues, function( leagueName )
                                    {
                                        //console.log( leagueName.handle + " == " + type.$.sb_type_id );
                                        if( leagueName.handle == type.$.sb_type_id )
                                        {
                                            logger.info("Se encontro la liga: ['" + sbclass.$.name + " - " + type.$.name + "']" );

                                            _.filter( type.Ev, function( eventName )
                                            {
                                                //console.log( eventName.$.name );

                                                var participantData = [],
                                                    eventNameType = null,
                                                    eventNameAux = eventName.$.name,
                                                    info = {
                                                        startTime: eventName.$.start_time,
                                                        gameTime: (function( seconds )
                                                        {
                                                            return (parseInt(seconds/60)+1) + "'";

                                                        })(eventName.Inplay[0].$.inplay_secs),
                                                        score: (function( sportID, Ev )
                                                        {
                                                            if( sportID == 1 )
                                                                return Ev.Inplay[0].$.score_string.replace('-',' : ');
                                                            else
                                                            {
                                                                return null;
                                                            }
                                                           
                                                        }( sport.id, eventName )),
                                                        game: null,
                                                        sets: null,
                                                        set: null,
                                                        hserving: null,
                                                        ycard: null,
                                                        rcard: null,
                                                        status: null
                                                    };

                                                if( eventNameAux.split(" v ").length == 2 )
                                                {
                                                    eventNameType = " v ";
                                                    eventNameAux = eventNameAux.split(" v ");
                                                }
                                                else if( eventNameAux.split(" @ ").length == 2 )
                                                {
                                                    eventNameType = " @ ";
                                                    eventNameAux = eventNameAux.split(" @ ");
                                                }

                                                _.filter( eventName.Mkt, function( market )
                                                {
                                                    var dataCorrect = false,
                                                        markets = [];

                                                    /* Comprobamos que exista el mercado */
                                                    var marketName = _.find( sport.markets, function( marketName)
                                                    {
                                                        //console.log( market.$.name +" === "+ marketName.name );

                                                        /* Si es un mercado valido */
                                                        if( marketName.name != null && market.$.name.trim().toLowerCase() === marketName.name.trim().toLowerCase() )
                                                        {
                                                            logger.info("Se ha encontrado el mercado: ['" + market.$.name + "']");

                                                            var aParticipant = [];

                                                            _.filter( market.Seln, function( participant )
                                                            {
                                                                //console.log( participant.$.name.trim().toLowerCase() );
                                                                if( participant.$.name.trim().toLowerCase() === 'draw')
                                                                {
                                                                    aParticipant.push({
                                                                        id: participant.Price[0].$.bet_ref,
                                                                        name: 'Draw',
                                                                        odd: parseFloat(participant.Price[0].$.dec_prc)
                                                                    });

                                                                    //console.log( "Busca: " + participant.$.name );
                                                                }
                                                                else
                                                                {
                                                                    //console.log("->" + _.contains(participantData, participant.$.name ) );

                                                                    if( _.contains(participantData, participant.$.name ) )
                                                                    {
                                                                        _.find( participantData, function( nameParticipant )
                                                                        {
                                                                            if( nameParticipant.name.trim().toLowerCase() == participant.$.name.trim().toLowerCase() )
                                                                            {
                                                                                aParticipant.push({
                                                                                    id: participant.Price[0].$.bet_ref,
                                                                                    name: participantName.feed,
                                                                                    odd: parseFloat(participant.Price[0].$.dec_prc)
                                                                                });

                                                                                //console.log( "Busca: " + participant.$.name );

                                                                                return nameParticipant;
                                                                            }
                                                                        });
                                                                    }
                                                                    else
                                                                    {
                                                                        /* Comprobamos partido de dobles de tenis */
                                                                        if( sport.id == 3 && participant.$.name.split(" / ").length > 1 )
                                                                        {
                                                                            var participantDouble = participant.$.name.split(" / "),
                                                                                participantArray = [];

                                                                            var fdouble = _.filter( participantDouble, function( doubleName )
                                                                            {
                                                                                /* Comprobamos si existe el participante */
                                                                                var fFind = _.filter( sport.participants, function( participantName )
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
                                                                                        else
                                                                                        {
                                                                                            participantArray[1] = {
                                                                                                id  : participantName.id,
                                                                                                name: participantName.name,
                                                                                                feed: participantName.feed,
                                                                                                img : participantName.img
                                                                                            };
                                                                                        }

                                                                                        return participantName;
                                                                                    }
                                                                                });
    
                                                                                if( fFind.length > 0 )
                                                                                    return doubleName;

                                                                            });

                                                                            if( fdouble.length > 1 )
                                                                            {
                                                                                var participantNameDouble = {
                                                                                    id  : [ participantArray[0].id, participantArray[1].id ],
                                                                                    name: participantArray[0].name + " / " + participantArray[1].name,
                                                                                    feed: participantArray[0].feed + " / " + participantArray[1].feed,
                                                                                    img : participantArray[0].img
                                                                                };

                                                                                aParticipant.push({
                                                                                    id: participant.Price[0].$.bet_ref,
                                                                                    name: participantNameDouble.feed,
                                                                                    odd: parseFloat(participant.Price[0].$.dec_prc)
                                                                                });

                                                                                if( participantNameDouble.name.trim().toLowerCase() == eventNameAux[0].trim().toLowerCase() )
                                                                                {
                                                                                    participantData[0] = {
                                                                                        id  : participantNameDouble.id,
                                                                                        name: participantNameDouble.name,
                                                                                        feed: participantNameDouble.feed,
                                                                                        img : participantNameDouble.img
                                                                                    };
                                                                                }
                                                                                else
                                                                                {
                                                                                    participantData[1] = {
                                                                                        id  : participantNameDouble.id,
                                                                                        name: participantNameDouble.name,
                                                                                        feed: participantNameDouble.feed,
                                                                                        img : participantNameDouble.img
                                                                                    };
                                                                                }
                                                                            }
                                                                            // else
                                                                            // {
                                                                            //     logger.warn("No se encuentran participantes suficientes para el evento: ['" + eventName.$.name + "']");
                                                                            // }

                                                                        }
                                                                        else
                                                                        {
                                                                            /* Comprobamos si existe el participante */
                                                                            _.filter( sport.participants, function( participantName )
                                                                            {
                                                                                if( participantName.name != null && participantName.name.trim().toLowerCase() == participant.$.name.trim().toLowerCase() )
                                                                                {
                                                                                    logger.info("Se ha encontrado el participante: ['" + participantName.name + "']");

                                                                                    aParticipant.push({
                                                                                        id: participant.Price[0].$.bet_ref,
                                                                                        name: participantName.feed,
                                                                                        odd: parseFloat(participant.Price[0].$.dec_prc)
                                                                                    });

                                                                                    if( eventNameType == " v " )
                                                                                    {
                                                                                        if( participant.$.name.trim().toLowerCase() == eventNameAux[0].trim().toLowerCase() )
                                                                                        {
                                                                                            participantData[0] = {
                                                                                                id  : participantName.id,
                                                                                                name: participant.$.name,
                                                                                                feed: participantName.feed,
                                                                                                img : participantName.img
                                                                                            };
                                                                                        }
                                                                                        else
                                                                                        {
                                                                                            participantData[1] = {
                                                                                                id  : participantName.id,
                                                                                                name: participant.$.name,
                                                                                                feed: participantName.feed,
                                                                                                img : participantName.img
                                                                                            };
                                                                                        }
                                                                                    }
                                                                                    else if( eventNameType == " @ " )
                                                                                    {
                                                                                        if( participant.$.name.trim().toLowerCase() == eventNameAux[0].trim().toLowerCase() )
                                                                                        {
                                                                                            participantData[1] = {
                                                                                                id  : participantName.id,
                                                                                                name: participant.$.name,
                                                                                                feed: participantName.feed,
                                                                                                img : participantName.img
                                                                                            };
                                                                                        }
                                                                                        else
                                                                                        {
                                                                                            participantData[0] = {
                                                                                                id  : participantName.id,
                                                                                                name: participant.$.name,
                                                                                                feed: participantName.feed,
                                                                                                img : participantName.img
                                                                                            };
                                                                                        }
                                                                                    }

                                                                                    //console.log( "Busca: " + participant.$.name );

                                                                                    return participantName;
                                                                                }
                                                                            });
                                                                        }
                                                                    }
                                                                }

                                                            });

                                                            //console.log( participantData );
                                                            //console.log( market.Seln.length + "==" + aParticipant.length );
                                                            if( market.Seln.length == aParticipant.length )
                                                            {
                                                                logger.info("Se han encontrado participantes suficientes para crear el evento.");

                                                                markets.push({
                                                                    id: marketName.id,
                                                                    id_group: marketName.id_group,
                                                                    name: marketName.feed,
                                                                    bets: aParticipant
                                                                });

                                                                dataCorrect = true;
                                                            }
                                                            else
                                                            {
                                                                logger.warn("No se encuentran participantes suficientes para el evento: ['" + eventName.$.name + "']");
                                                            }

                                                            return marketName;
                                                        }
                                                    });

                                                    if( dataCorrect && marketName != undefined && participantData.length > 0 )
                                                    {
                                                        console.log( leagueName );

                                                        exit.push({
                                                            sport: sport.type,
                                                            sportID: sport.id,
                                                            league: leagueName.feed,
                                                            event: participantData[0].feed + " vs " + participantData[1].feed,
                                                            info: info,
                                                            participants: _.map(participantData, function( data )
                                                            {
                                                                return {
                                                                    id  : data.id,
                                                                    name: data.feed,
                                                                    img : data.img
                                                                }
                                                            }),
                                                            markets: markets
                                                        });
                                                    }

                                                    if( marketName == undefined )
                                                    {
                                                        logger.warn("No se encuentra ningun mercado para el evento: ['" + eventName.$.name + "']");
                                                    }
                                                });
                                            });

                                            /* Si encontramos la liga salimos del bucle */
                                            return leagueName;
                                        }
                                    });

                                    if( fLeague == undefined )
                                    {
                                        logger.warn("No se encuentra la liga: ['" + sbclass.$.name + " - " + type.$.name + "']");
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
            var json = typeof( result.ContentAPI.Sport ) != 'undefined' 
                   ? result.ContentAPI.Sport : [];

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