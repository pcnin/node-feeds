"use strict";

/**********************************************************/
/*                      Includes                          */
/**********************************************************/
var fn          = require("./functions.js"),
    fs          = require('fs'),
    file        = "./dictionary/luckia.js",
    Q           = require("q"),
    _           = require("underscore"),
    dictionary  = fn._readFile( file ),
    parseString = require('xml2js').parseString,
    log4js      = require('log4js');

// logger.setLevel('ERROR');
// logger.trace('Entering cheese testing');
// logger.debug('Got cheese.');
// logger.info('Cheese is Gouda.');
// logger.warn('Cheese is quite smelly.');
// logger.error('Cheese is too ripe!');
// logger.fatal('Cheese was breeding ground for listeria.');


/**********************************************************/
/*                      Variables                         */
/**********************************************************/
const ID_FEED = 17,
      NAME_FEED = 'Luckia';

log4js.configure({
  appenders: [
    { type: 'console' },
    //{ type: 'file', filename: 'logs/luckia.log', category: 'luckia' }
  ]
});

var logger = log4js.getLogger('luckia');

fs.watch( file, (curr, prev) => 
{
    dictionary = fn._readFile( file );
});

/* Deportes */
var aSBTechSport = [];
    aSBTechSport[1]  = 1;       // Soccer
    aSBTechSport[2]  = 2;       // BasketBall
    aSBTechSport[6]  = 3;       // Tennis
    // aSBTechSport[14] = 5;       // Motor Racing
    // aSBTechSport[16] = 6;       // Cycling
    // aSBTechSport[20] = 7;       // Boxing

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
                data = _.filter( json, function( DATA )
                {
                    /* Comprobamos si existe el deporte */
                    _.find( dictionary, function( sport )
                    {
                        //console.log( sport.id + " == " + aSBTechSport[ DATA.$.BranchID ] );
                        /* Comprobamos que tengamos el deporte */
                        if( sport.id == aSBTechSport[ DATA.$.BranchID ] )
                        {
                            /* Comprobamos si existe la liga */
                            var fLeague = _.find( sport.leagues, function( leagueName )
                            {
                                //console.log( DATA.$.LeagueID + " == " + leagueName.handle );
                                if( DATA.$.LeagueID == leagueName.handle )
                                {
                                    logger.info("Se encontro la liga: ['" + leagueName.name + "']" );

                                    var fParticipant = undefined,
                                        aMembers = [],
                                        participantData = [],
                                        participantArray = [];

                                    /* Participantes */
                                    aMembers[0] = DATA.$.Home;
                                    aMembers[1] = DATA.$.Away;

                                    /* Comprobamos partido de dobles de tenis */
                                    if( sport.id == 3 && aMembers.length > 1 && aMembers[0].split(" / ").length > 1 && aMembers[1].split(" / ").length > 1 )
                                    {
                                        var participantDouble = aMembers[0].split(" / ").concat( aMembers[1].split(" / ") );

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

                                            if( participantArray[0].name.trim().toLowerCase() + "/" + participantArray[1].name.trim().toLowerCase() == aMembers[0].trim().toLowerCase() )
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
                                            
                                            if( participantArray[2].name.trim().toLowerCase() + "/" + participantArray[3].name.trim().toLowerCase() == aMembers[1].trim().toLowerCase() )
                                            {
                                                participantNameDouble = {
                                                    id  : [ participantArray[1].id, participantArray[2].id ],
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
                                            if( participantName.name != null )
                                            {
                                                if( participantName.name.trim().toLowerCase() == aMembers[0].trim().toLowerCase() )
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
                                                else if( participantName.name.trim().toLowerCase() == aMembers[1].trim().toLowerCase() )
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

                                    // console.log( fParticipant );
                                    // console.log( participantData );

                                    /* Si encontramos participantes suficientes para crear el evento */
                                    if( fParticipant.length > 1 && participantData.length > 1 )
                                    {
                                        logger.info("Se han encontrado participantes suficientes para crear el evento.");

                                        var markets = [],
                                            info = {
                                                startTime: null,
                                                gameTime: null,
                                                game: null,
                                                score: null,
                                                sets: null,
                                                set: null,
                                                ycard: null,
                                                rcard: null
                                            };

                                        _.filter( DATA.Markets, function( MARKETS )
                                        {
                                            _.filter( MARKETS.Event, function( MARKET )
                                            {
                                                //var str_market = MARKET.$.model + " - " + MARKET.$.name;
                                                var str_market = MARKET.$.Type;

                                                var fMarkets = _.find( sport.markets, function( marketName )
                                                {
                                                    //console.log( typeof marketName.name );

                                                    if( marketName.name != null && marketName.name.toString().trim().toLowerCase() == str_market.trim().toLowerCase() )
                                                    {
                                                        logger.info("Se ha encontrado el mercado: ['" + marketName.feed + "']");

                                                        var aParticipant = [];

                                                        _.filter( MARKET.MoneyLine, function( SEL )
                                                        {
                                                            aParticipant.push({
                                                                id: SEL.$.Home_LineID,
                                                                name: participantData[0].feed,
                                                                tip: '1',
                                                                odd: parseFloat(SEL.$.Home)
                                                            });

                                                            if( SEL.$.Draw )
                                                            {
                                                                aParticipant.push({
                                                                    id: SEL.$.Draw_LineID,
                                                                    name: 'Draw',
                                                                    tip: 'X',
                                                                    odd: parseFloat(SEL.$.Draw)
                                                                });
                                                            }

                                                            aParticipant.push({
                                                                id: SEL.$.Away_LineID,
                                                                name: participantData[1].feed,
                                                                tip: '2',
                                                                odd: parseFloat(SEL.$.Away)
                                                            });
                                                        });

                                                        if( aParticipant.length > 1 )
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
                                                    logger.warn("No se encuentra el mercado: ['" + str_market + "']");
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
                                                markets: markets
                                            });
                                        }
                                        else
                                        {
                                            logger.warn("No se encuentra ningun mercado para el evento: ['" + aMembers[0] + " vs " + aMembers[1] + "']");
                                        }  
                                    }
                                    else
                                    {
                                        logger.warn("No se encuentran participantes suficientes para el evento: ['" + aMembers[0] + " vs " + aMembers[1] + "']");
                                    }                                           
                                }
                            });

                            if( fLeague == undefined )
                            {
                                logger.warn("No se encuentra la liga: ['" + DATA.$.LeagueID + "']");
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
            var json = typeof( result.Events.Game ) != 'undefined' 
                   ? result.Events.Game : [];

            // console.log( JSON.stringify(json) );

            return getDataJson( json );
        })
        .then( function( data )
        {
            var aData = {
                feedID: ID_FEED,
                feed: NAME_FEED,
                data: data
            }
            console.log( JSON.stringify(aData) );
            
            return defer.resolve( aData );
        })
        .fail( function( err )
        {
            logger.fatal("error: " + err);
            return defer.reject(err.message);
        });

    return defer.promise;
};