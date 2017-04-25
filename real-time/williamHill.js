"use strict";

/**********************************************************/
/*                      Includes                          */
/**********************************************************/
var fn          = require("./functions.js"),
    fs          = require('fs'),
    file        = "./dictionary/williamHill.js",
    Q           = require("q"),
    _           = require("underscore"),
    dictionary  = fn._readFile( file ),
    parseString = require('xml2js').parseString,
    log4js      = require('log4js');

/**********************************************************/
/*                      Variables                         */
/**********************************************************/
const ID_FEED = 3,
      NAME_FEED = 'William Hill';

log4js.configure({
  appenders: [
    { type: 'console' },
    //{ type: 'file', filename: 'logs/williamhill.log', category: 'williamhill' }
  ]
});

var logger = log4js.getLogger('williamhill'),
    nSport = new Array();

    nSport[36]  = 1;        // International Football
    nSport[46]  = 1;        // Europa league Football
    nSport[43]  = 3;        // Tenis Masculino
    nSport[274] = 1;        // Other League Football
    nSport[275] = 1;        // Competiciones Europeas
    nSport[273] = 2;        // European Basketball
    nSport[336] = 2;        // EEUU Basketball
    nSport[424] = 3;        // Tenis Challenger

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
    }

    function getDataJson( json )
    {
        try
        {
            var exit = [],
                data = _.filter( json, function( group )
                {
                    //console.log( group.$.name );
                    var sportType = nSport[group.$.id];

                    /* Comprobamos si existe el deporte */
                    _.filter( dictionary, function( sport )
                    {
                        //console.log( sport.type + " == " + group.$.sport_code );
                        /* Comprobamos que tengamos el deporte */
                        if( sport.id == sportType )
                        {
                            _.filter( group.type, function( type )
                            {
                                //console.log( "->" + type.$.name );
                                /* Comprobamos si existe la liga */
                                var fLeague = _.find( sport.leagues, function( leagueName )
                                {
                                    //console.log( leagueName.name + " == " + type.$.name );
                                    //if( leagueName.len == type.$.name.length && leagueName.name == type.$.name )
                                    if( leagueName.handle == type.$.id )
                                    {
                                        logger.info("Se encontro la liga: ['" + type.$.name + "']" );

                                        _.filter( type.market, function( market )
                                        {
                                            var nameEvent = market.$.name.split(" - "),
                                                dataCorrect = false,
                                                participantData = [],
                                                markets = [];

                                            /* Comprobamos que exista el mercado */
                                            var marketName = _.find( sport.markets, function( marketName )
                                            {
                                                //console.log( nameEvent[1] + " == " + marketName.name );
                                                /* Si es un mercado valido */
                                                if( nameEvent[1].trim().toLowerCase() === marketName.name.trim().toLowerCase() )
                                                {
                                                    logger.info("Se ha encontrado el mercado: ['" + market.$.name + "']");

                                                    var aParticipant = [];

                                                    _.filter( market.participant, function( participant )
                                                    {
                                                        /* Comprobamos partido de dobles de tenis */
                                                        if( sport.id == 3 && participant.$.name.split("/").length > 1 )
                                                        {
                                                            var participantDouble = participant.$.name.split("/"),
                                                                participantArray = [];

                                                            var fdouble = _.filter( participantDouble, function( doubleName )
                                                            {
                                                                /* Comprobamos si existe el participante */
                                                                var fParticipant = _.filter( sport.participants, function( participantName )
                                                                {
                                                                    if( participantName.name != null && participantName.name.trim().toLowerCase() == doubleName.trim().toLowerCase() )
                                                                    {
                                                                        logger.info("Se ha encontrado el participante: ['" + participantName.name + "']");

                                                                        participantArray.push({
                                                                            name: participantName.name,
                                                                            feed: participantName.feed
                                                                        });
                                                                        return participantName;
                                                                    }
                                                                });

                                                                if( fParticipant.length > 0 )
                                                                    return doubleName;

                                                            });

                                                            if( fdouble.length == 2 )
                                                            {
                                                                var market_url = market.$.url.split("/e/"),
                                                                    market_id = market_url[1].split("/");

                                                                aParticipant.push({
                                                                    id: participant.$.id + "|" + market_id[0],
                                                                    name: participantArray[0].feed + " / " + participantArray[1].feed,
                                                                    odd: parseFloat(participant.$.oddsDecimal)
                                                                });

                                                                participantData.push({
                                                                    id: participant.$.id,
                                                                    name: participantArray[0].name + " / " + participantArray[1].name,
                                                                    feed: participantArray[0].feed + " / " + participantArray[1].feed,
                                                                });
                                                            }
                                                        }
                                                        else
                                                        {

                                                            //console.log( "Busca: " + participant.$.name );
                                                            if( participant.$.name.trim().toLowerCase() === 'draw' || participant.$.name.trim().toLowerCase() === 'tie' )
                                                            {
                                                                var market_url = market.$.url.split("/e/"),
                                                                    market_id = market_url[1].split("/");

                                                                aParticipant.push({
                                                                    id: participant.$.id + "|" + market_id[0],
                                                                    name: 'Draw',
                                                                    odd: parseFloat(participant.$.oddsDecimal)
                                                                });

                                                                //console.log( participant.$.name );
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
                                                                            var market_url = market.$.url.split("/e/"),
                                                                                market_id = market_url[1].split("/");

                                                                            aParticipant.push({
                                                                                id: participant.$.id + "|" + market_id[0],
                                                                                name: nameParticipant.feed,
                                                                                odd: parseFloat(participant.$.oddsDecimal)
                                                                            });

                                                                            return nameParticipant;
                                                                        }
                                                                    });
                                                                }
                                                                else
                                                                {
                                                                    /* Comprobamos si existe el participante */
                                                                    _.find( sport.participants, function( participantName )
                                                                    {
                                                                        if( participantName.name != null && participantName.name.trim().toLowerCase() == participant.$.name.trim().toLowerCase() )
                                                                        {
                                                                            logger.info("Se ha encontrado el participante: ['" + participantName.name + "']");

                                                                            var market_url = market.$.url.split("/e/"),
                                                                                market_id = market_url[1].split("/");

                                                                            aParticipant.push({
                                                                                id: participant.$.id + "|" + market_id[0],
                                                                                name: participantName.feed,
                                                                                odd: parseFloat(participant.$.oddsDecimal)
                                                                            });

                                                                            participantData.push({
                                                                                id: participant.$.id,
                                                                                name: participant.$.name,
                                                                                feed: participantName.feed
                                                                            });

                                                                            return participantName;
                                                                        }
                                                                    });
                                                                }
                                                            }
                                                        }
                                                    });
                                                    
                                                    // console.log(aParticipant);
                                                    // console.log( market.participant.length + " == " + aParticipant.length );

                                                    if( market.participant.length == aParticipant.length )
                                                    {
                                                        logger.info("Se han encontrado participantes suficientes para crear el evento.");

                                                        aParticipant = aParticipant.sort( fn._order('id') );

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
                                                        logger.warn("No se encuentran participantes suficientes para el evento: ['" + nameEvent[0] + "']");
                                                    }

                                                    return marketName;
                                                }         
                                            });

                                            //console.log( dataCorrect + " && " + marketName );

                                            if( dataCorrect && marketName != undefined )
                                            {
                                                participantData = participantData.sort( fn._order('id') );

                                                exit.push({
                                                    sport: sport.type,
                                                    sportID: sport.id,
                                                    league: leagueName.feed,
                                                    event: participantData[0].feed + " vs " + participantData[1].feed,
                                                    participants: _.map(participantData, function( data )
                                                    {
                                                        return data.feed;
                                                    }),
                                                    markets: markets
                                                });
                                            }

                                            if( marketName == undefined )
                                            {
                                                logger.warn("No se encuentra ningun mercado para el evento: ['" + market.$.name + "']");
                                            }
                                        });

                                        /* Si encontramos la liga salimos del bucle */
                                        return leagueName;
                                    }
                                });

                                if( fLeague == undefined )
                                {
                                    logger.warn("No se encuentra la liga: ['" + type.$.name + "']");
                                }
                            });

                            return sport;
                        }
                    });
                    
                }, [] );

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
            var json = typeof( result.oxip.response[0].williamhill ) != 'undefined' 
                   ? result.oxip.response[0].williamhill[0].class : [];

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