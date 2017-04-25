"use strict";

/**********************************************************/
/*                      Includes                          */
/**********************************************************/
var fn          = require("./functions.js"),
    fs          = require('fs'),
    file        = "./dictionary/paf.js",
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
const ID_FEED = 2,
      NAME_FEED = 'PAF';

log4js.configure({
  appenders: [
    { type: 'console' },
    //{ type: 'file', filename: 'logs/Paf.log', category: 'Paf' }
  ]
});

var logger = log4js.getLogger('Paf');

fs.watch( file, (curr, prev) => 
{
    dictionary = fn._readFile( file );
});

var parser = module.exports.parser = function ( xml )
{
    var defer = Q.defer();

    function parserXML( xml )
    {
        var defer = Q.defer();

        parseString( xml, function ( err, result ) 
        {
            return err ? defer.reject( new Error("Archivo No Leído") ) : defer.resolve( result );
        });

        return defer.promise;
    };

    function getDataJson( json )
    {
        try
        {
            var exit = [],
                data = _.filter( json, function( eventData )
                {
                    /* Comprobamos si existe el deporte */
                    _.filter( dictionary, function( sport )
                    {
                        //console.log( sport.name.trim().toUpperCase() + " == " + eventData.sport[0] );
                        /* Comprobamos que tengamos el deporte */
                        if( sport.name.trim().toUpperCase() == eventData.sport[0] )
                        {
                            /* Buscamos la liga */
                            var fLeague = _.find( sport.leagues, function( league )
                            {
                                if( eventData.group && eventData.group[0].group && eventData.group[0].group[0].group )
                                    return league.handle == eventData.group[0].group[0].group[0].$.id;
                            });

                            if( fLeague != undefined )
                            {
                                //console.log( eventData.$.name );

                                var eventName = eventData.$.name.split(" - "),
                                participantData = [],
                                participantArray = [],
                                aParticipant = [],
                                markets = [];

                                if( sport.id == 3 && eventName[0].split("/").length > 1 && eventName[1].split("/").length > 1 )
                                {
                                    var participantDouble = eventName[0].split("/").concat( eventName[1].split("/") );

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

                                        if( participantArray[0].name.trim().toLowerCase() + " / " + participantArray[1].name.trim().toLowerCase() == eventName[0].trim().toLowerCase() )
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
                                        
                                        if( participantArray[2].name.trim().toLowerCase() + " / " + participantArray[3].name.trim().toLowerCase() == eventName[1].trim().toLowerCase() )
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

                                        fParticipant = participantData;
                                    }
                                }
                                else
                                {
                                    var fParticipant = _.filter( sport.participants, function( participantName )
                                    {
                                        if( participantName.name != null )
                                        {
                                            if( participantName.name.toLowerCase() == eventName[0].toLowerCase() )
                                            {
                                                participantData[0] = {
                                                    id  : participantName.id,
                                                    name: participantName.name,
                                                    feed: participantName.feed,
                                                    img : participantName.img
                                                };

                                                logger.info("Se ha encontrado el participante local: ['" + participantName.name + "']");

                                                return participantName;
                                            }
                                            else if( participantName.name.toLowerCase() == eventName[1].toLowerCase() )
                                            {
                                                participantData[1] = {
                                                    id  : participantName.id,
                                                    name: participantName.name,
                                                    feed: participantName.feed,
                                                    img : participantName.img
                                                };

                                                logger.info("Se ha encontrado el participante visitante: ['" + participantName.name + "']");

                                                return participantName;
                                            }
                                        }

                                    });
                                }

                                if( fParticipant.length == 2 || fParticipant.length == 4 )
                                {
                                    logger.info("Se han encontrado participantes suficientes para crear el evento.");

                                    /* Buscamos mercados */
                                    /* Inicializamos datos */
                                    var markets = [];

                                    _.each( eventData.product, function( market )
                                    {
                                        var fMarket = _.find( sport.markets, function( dictionaryMarket )
                                        {
                                            //console.log( dictionaryMarket.name + " == " + market.$.name + " - " + market.$.type );
                                            return dictionaryMarket.name == market.$.name + " - " + market.$.type;
                                        });

                                        if( fMarket != undefined )
                                        {
                                            //console.log( fMarket );

                                            logger.info("Se ha encontrado el mercado: ['" + fMarket.name + "']");

                                            /* Incializamos apuestas */
                                            var aResults = [];

                                            _.each( market.choice, function( bet )
                                            {
                                                if( bet.$.name == 'X' )
                                                {
                                                    aResults.push({
                                                        id: bet.$.id,
                                                        name: 'Draw',
                                                        odd: parseFloat( bet.odds[0] / 1000 )
                                                    });
                                                }
                                                else
                                                {
                                                    //console.log( fParticipant );

                                                    aResults.push({
                                                        id: bet.$.id,
                                                        name: (bet.$.name == '1') ? fParticipant[0].feed : fParticipant[1].feed,
                                                        odd: parseFloat( bet.odds[0] / 1000 )
                                                    });
                                                }
                                            });

                                             markets.push({
                                                id: fMarket.id,
                                                id_group: fMarket.id_group,
                                                name: fMarket.feed,
                                                bets: aResults
                                            });
                                        }
                                        else
                                            logger.warn("No se encuentra el mercado: ['" + market.$.name + " - " + market.$.type + "']");
                                    });

                                    if( markets.length > 0)
                                    {
                                        exit.push({
                                            sport: sport.type,
                                            sportID: sport.id,
                                            league: fLeague.feed,
                                            // id_event: eventData.$.id,
                                            event: fParticipant[0].feed + " vs " + fParticipant[1].feed,
                                            info: {
                                                startTime: null,
                                                gameTime: null,
                                                game: null,
                                                score: null,
                                                sets: null,
                                                set: null,
                                                ycard: null,
                                                rcard: null
                                            },
                                            participants: _.map(fParticipant, function( data )
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
                                }
                                else
                                    logger.warn("No se encuentran participantes suficientes para el evento: ['" + eventData.$.name + "']");
                            }
                            else
                            {
                                if( eventData.group && eventData.group[0].group && eventData.group[0].group[0].group )
                                    logger.warn("No se encuentran la liga: ['" + eventData.group[0].$.name + " - " + eventData.group[0].group[0].$.name + " - " + eventData.group[0].group[0].group[0].$.name + "']");                                    
                            }
                                
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
            console.log( JSON.stringify(result) );

             var json = typeof( result.paf.message ) != 'undefined' 
                   ? result.paf.message[0].event : [];

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
