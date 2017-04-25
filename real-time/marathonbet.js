"use strict";

/**********************************************************/
/*                      Includes                          */
/**********************************************************/
var fn          = require("./functions.js"),
    fs          = require('fs'),
    file        = "./dictionary/marathonbet.js",
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
const ID_FEED = 15,
      NAME_FEED = 'MarathonBet';

log4js.configure({
  appenders: [
    { type: 'console' },
    //{ type: 'file', filename: 'logs/interwetten.log', category: 'interwetten' }
  ]
});

var logger = log4js.getLogger('marathonbet');

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
                data = _.filter( json, function( DATA )
                {
                    /* Comprobamos si existe el deporte */
                    _.find( dictionary, function( sport )
                    {
                        // console.log( sport.name.trim().toLowerCase() + " == " + DATA.$.code.trim().toLowerCase() );

                        /* Comprobamos que tengamos el deporte */
                        if( sport.name.trim().toLowerCase() == DATA.$.code.trim().toLowerCase() )
                        {
                            _.filter( DATA.groups, function( GROUPS )
                            {
                                _.filter( GROUPS.group, function( LEAGUE )
                                {
                                    /* Comprobamos si existe la liga */
                                    var fLeague = _.find( sport.leagues, function( leagueName )
                                    {
                                        // console.log( LEAGUE.$.treeId + " == " + league.handle );
                                        // console.log( LEAGUE.$.name );

                                        //if( LEAGUE.$.treeId == leagueName.handle )
                                        if( LEAGUE.$.name == leagueName.name )
                                        {
                                            logger.info("Se encontro la liga: ['" + LEAGUE.$.name + "']" );

                                            _.filter( LEAGUE.events, function( EVENTS )
                                            {
                                                _.filter( EVENTS.event, function( EVENT )
                                                {
                                                    var fParticipant = undefined,
                                                        aMembers = [],
                                                        participantData = [],
                                                        participantArray = [];

                                                    if( typeof(EVENT.members[0]) ==  "object" )
                                                    {
                                                        /* Recogemos los participantes */
                                                        _.filter( EVENT.members, function( MEMBERS )
                                                        {
                                                            _.filter( MEMBERS.member, function( MEMBER)
                                                            {
                                                                if( MEMBER.$.selkey.trim().toLowerCase() == 'home' )
                                                                {
                                                                    aMembers[0] = MEMBER.$.name;
                                                                }
                                                                else if( MEMBER.$.selkey.trim().toLowerCase() == 'away' )
                                                                {
                                                                    aMembers[1] = MEMBER.$.name;
                                                                }
                                                            });
                                                        });
                                                    }
                                                    else if( typeof(EVENT.members[0]) ==  "string" )
                                                    {
                                                        aMembers[0] = (EVENT.teams[0].team1[0].$.type.trim().toLowerCase() == 'home') ? 
                                                                      EVENT.teams[0].team1[0].$.name : 
                                                                      EVENT.teams[0].team2[0].$.name;
                                                        aMembers[1] = (EVENT.teams[0].team2[0].$.type.trim().toLowerCase() == 'away') ? 
                                                                      EVENT.teams[0].team2[0].$.name : 
                                                                      EVENT.teams[0].team1[0].$.name;
                                                    }

                                                    /* Comprobamos partido de dobles de tenis */
                                                    if( sport.id == 3 && aMembers.length > 1 && aMembers[0].split("/").length > 1 && aMembers[1].split("/").length > 1 )
                                                    {
                                                        var participantDouble = aMembers[0].split("/").concat( aMembers[1].split("/") );

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

                                                        //console.log( JSON.stringify(EVENT) );

                                                        var markets = [],
                                                            liveresult = (function( liveresult )
                                                            {
                                                                var tempScore = null,
                                                                    tempGame = null,
                                                                    tempSet = [],
                                                                    nTempSet = 0,
                                                                    ycard = null,
                                                                    rcard = null;

                                                                switch(sport.id)
                                                                {
                                                                    case 1:
                                                                        // "1:2 (0:1)"
                                                                        var temp = liveresult.split(" (")[0],
                                                                            tempS = temp.split(":"),
                                                                            tempScore = tempS[0] + " : " + tempS[1];
                                                                    break;
                                                                    case 2:
                                                                        var temp = liveresult.split(" (")[0],
                                                                            tempS = temp.split(":"),
                                                                            tempScore = tempS[0] + " : " + tempS[1];
                                                                    break;
                                                                    case 3:
                                                                        // "1:1 (6:4, 2:6, _3:2_) (*0:0)"
                                                                        // "4:3 (*0:0)"
                                                                        console.log( liveresult );

                                                                        var temp = liveresult.split(" (");

                                                                        if( temp.length == 2 )
                                                                        {
                                                                            var tempGame = null,
                                                                                tempSet  = temp[0].split(','),
                                                                                nTempSet = tempSet.length-1;

                                                                            var temp2 = temp[1].replace(/\)/g, ''),
                                                                                tempHserving = temp2.charAt(0) == '*' ? true : false,
                                                                                temp3 = temp2.replace(/\*/g, '').split(":"),
                                                                                tempScore = temp3[0] + " : " + temp3[1];
                                                                        }
                                                                        else if( temp.length > 2 )    
                                                                        {
                                                                            var temp1 = temp[0].split(":"),
                                                                                tempGame = temp1[0] + " : " + temp1[1];

                                                                            var tempSet = temp[1].replace(/_/g, '')
                                                                                                 .replace(/\)/g, '')
                                                                                                 .split(','),
                                                                                nTempSet = tempSet.length-1;

                                                                            var temp2 = temp[2].replace(/\)/g, ''),
                                                                                tempHserving = temp2.charAt(0) == '*' ? true : false,
                                                                                temp3 = temp2.replace(/\*/g, '').split(":"),
                                                                                tempScore = temp3[0] + " : " + temp3[1];
                                                                        }
                                                                    break;
                                                                }

                                                                return {
                                                                    score: tempScore,
                                                                    game: tempGame,
                                                                    sets: tempSet[ nTempSet ],
                                                                    set: tempSet
                                                                }

                                                            })( EVENT.liveresult[0] ),
                                                            liveTime = (function(time)
                                                            {
                                                                return null;

                                                                if( !time || time == '0:00' ) return null;

                                                                // "60:45"
                                                                var aux = time.split(":")[0],
                                                                    rtime = parseInt(aux) + 1;

                                                                return rtime + "'";
                                                            })( EVENT.livetime[0] ),
                                                            info = {
                                                                startTime: EVENT.$.date,
                                                                gameTime: liveTime,
                                                                game: liveresult.game,
                                                                score: liveresult.score,
                                                                sets: liveresult.sets,
                                                                set: liveresult.set,
                                                                ycard: null,
                                                                rcard: null
                                                            };

                                                        _.filter( EVENT.markets, function( MARKETS )
                                                        {
                                                            _.filter( MARKETS.market, function( MARKET )
                                                            {
                                                                //var str_market = MARKET.$.model + " - " + MARKET.$.name;
                                                                var str_market = MARKET.$.name;

                                                                var fMarkets = _.find( sport.markets, function( marketName )
                                                                {
                                                                    if( marketName.name != null && marketName.name.trim().toLowerCase() == str_market.trim().toLowerCase() )
                                                                    {
                                                                        logger.info("Se ha encontrado el mercado: ['" + str_market + "']");

                                                                        var aParticipant = [];

                                                                        _.filter( MARKET.sel, function( SEL )
                                                                        {
                                                                            switch( SEL.$.selkey.trim().toLowerCase() ) 
                                                                            {
                                                                                case 'd': // Draw
                                                                                    aParticipant.push({
                                                                                        id: EVENT.$.treeId,
                                                                                        name: 'Draw',
                                                                                        tip: 'X',
                                                                                        odd: parseFloat(SEL.$.coeff)
                                                                                    });
                                                                                break;
                                                                                case 'h':
                                                                                    aParticipant.push({
                                                                                        id: EVENT.$.treeId,
                                                                                        name: participantData[0].feed,
                                                                                        tip: '1',
                                                                                        odd: parseFloat(SEL.$.coeff)
                                                                                    });
                                                                                break;
                                                                                case 'a':
                                                                                    aParticipant.push({
                                                                                        id: EVENT.$.treeId,
                                                                                        name: participantData[1].feed,
                                                                                        tip: '2',
                                                                                        odd: parseFloat(SEL.$.coeff)
                                                                                    });
                                                                                break;
                                                                            }
                                                                        });

                                                                        if( MARKET.sel.length == aParticipant.length )
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
                                                            logger.warn("No se encuentra ningun mercado para el evento: ['" + EVENT.$.name + "']");
                                                        }  
                                                    }
                                                    else
                                                    {
                                                        logger.warn("No se encuentran participantes suficientes para el evento: ['" + aMembers[0] + " vs " + aMembers[1] + "']");
                                                    }                                           
                                                });
                                            });
                                        }
                                    });

                                    if( fLeague == undefined )
                                    {
                                        logger.warn("No se encuentra la liga: ['" + LEAGUE.$.name + " - (" + LEAGUE.$.treeId + ")']");
                                    }
                                });
                            });                            
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
            var json = typeof( result.root.sport ) != 'undefined' 
                   ? result.root.sport : [];

            //console.log( JSON.stringify(json) );

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