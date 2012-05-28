/*
* 
*   Biff.js - JavaScript DOM Game Framework v0.9.7
*
*   Copyright 2011, Joel Sunman
*
    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. 
* 
*   Includes Mibbu.js
*   http://mibbu.eu/
*   Copyright 2011, Michal Budzynski
*   Released under the MIT License.

*/

var Biff = function(Cwidth, Cheight, _parent){
    var BF_usingCSSAnimations = false,
        document = window['document'], //document declaration for Closure Compiler
        BF_elements = [], //all drawable elements
        BF_parentElement = _parent ? document.getElementById(_parent) : document.body, //parent element the canvas will be appended to
        BF_mainCanvas,
        BF_mainCanvasWidth = Cwidth || 320,
        BF_mainCanvasHeight = Cheight || 480,
        BF_addedLoops=[], //functions added to each loop frame
        BF_drawLoop, //main loop
		BF_scoring=false,
        BF_collides=[], //array with references to objects with enabled collisions
        BF_fixedIndexColl = [], //workaround for collisions
        BF_Animate,
        BF_mainCanvasStyle,
        BF_prefixCSS,
        BF_prefixJS,
		BF_controlsDiv = false,
		BF_controls = false,
		BF_isAndroid=false,
		
// set up stats
		stats, BF_stats=false, 
    
// check for 3D, use translate3d or absolute positioning for movement, currently only works with  webkit
		has3d = ('WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix());
	
// check if Android. Android browser (<=2.3) does not handle sprite animations correctly 
	if (navigator.appVersion.match(/Android/ig) !== null) {
		BF_isAndroid = true;
	}
	
// lastIndexOf implementation by Andrea Giammarchi from Falsy Values conference http://webreflection.blogspot.com
    Array.prototype.i = Array.prototype.indexOf ||
    function(value){
        for (var i = this.length; i-- && this[i]!== value;) {}
        return i;
    };

//and custom remove() method
    var rm = function(value, array) {
        if (array.i(value)!==-1) {
            array.splice(array.i(value), 1);
            return true;
        } else {
            return false;
        }
    } ;
	
// Scoring Functions
	var score=maxScore=0,
		stringScore = score; 
    var MeasureScore = function(){
        stringScore = score;        
		if (BF_scoring) {
			BF_scoreDiv.innerHTML = stringScore;
		}
    };
    
    var calculateSpeed = function(speed, frames) {
        return (~~((1/(60/speed))*100)/100)*(frames+1);
    };
    
//main drawing function
    var DrawAll = function(){
        
        //draw all element
        var loopIndex = BF_elements.length;
        while (loopIndex--) {
            BF_elements[loopIndex].draw();
        }
        
        //run other functions
        loopIndex = BF_addedLoops.length;
        while (loopIndex--) {
			// update our stats if on
			if(BF_stats) {
				stats.update();
			}
			BF_addedLoops[loopIndex]();
        }
		
		if (BF_scoring) { MeasureScore(); }
                
    };
    
    var BF_InitCore = function() {	
        //use requestAnimationFrame() if possible inspired by Paul Irish Blog
        //http://paulirish.com/2011/requestanimationframe-for-smart-animating/
        BF_Animate = (function(){
			return  window.requestAnimationFrame       || 
				  	window.webkitRequestAnimationFrame || 
				  	window.mozRequestAnimationFrame    || 
				  	window.oRequestAnimationFrame      || 
				  	window.msRequestAnimationFrame     ||
				  	function(/* function */ callback, /* DOMElement */ element){
                        setTimeout(callback, 1000 / 60);
                    };
        })();
        
        //inline styling, not using setAttribute() because of IE7 & IE8 bugs
        BF_mainCanvasStyle = BF_mainCanvas.style;
        BF_mainCanvas.width = BF_mainCanvasWidth;
        BF_mainCanvas.height = BF_mainCanvasHeight;
        BF_mainCanvasStyle.width = BF_mainCanvasWidth+'px';
        BF_mainCanvasStyle.height =BF_mainCanvasHeight+'px';
        
        BF_parentElement.appendChild(BF_mainCanvas);
        
    };     
    
    var BF_InitDOM = function() {
                    
        BF_mainCanvas = document.createElement('div');
        BF_mainCanvas.id = "biff_stage";
        
		if (BF_controls) {
            BF_controlsDiv = document.createElement('div');
			BF_controlsDiv.id = "biff_controls";
            BF_mainCanvas.appendChild(BF_controlsDiv);
			
			BF_startDiv = document.createElement('span');
			BF_startDiv.id = "biff_start";
			BF_startDiv.innerHTML = "Start";
            BF_controlsDiv.appendChild(BF_startDiv);
			
			BF_pauseDiv = document.createElement('span');
			BF_pauseDiv.id = "biff_pause";
			BF_pauseDiv.innerHTML = "Pause";
            BF_controlsDiv.appendChild(BF_pauseDiv);
			
			BF_replayDiv = document.createElement('span');
			BF_replayDiv.id = "biff_replay";
			BF_replayDiv.innerHTML = "Replay";
            BF_controlsDiv.appendChild(BF_replayDiv);
        }
		
		if (BF_scoring) {
			if (document.getElementById('biff_score')) {
				// Developer has already added #biff_score to the document
				BF_scoreDiv = document.getElementById('biff_score');
			} else {
				//create an element to display score
				BF_scoreDiv = document.createElement('div');
				BF_scoreDiv.id = "biff_score";
				if (BF_controlsDiv) {
					BF_controlsDiv.appendChild(BF_scoreDiv);
				} else {
					BF_mainCanvas.appendChild(BF_scoreDiv);
				}
			}
        }
        
    };
    
    //initiation of main loop
    var running = false,
     	BF_Start = function() {
        DrawAll();
        
        if(running) {
			BF_drawLoop = BF_Animate(BF_Start, BF_mainCanvas);
		}
    };
    
    var BF_Stop = function() {
		running=false;
        clearTimeout(BF_drawLoop);
    };
    
	// random number helper
	var BF_Rnd = function(from, to) {
		var rand=(Math.floor(Math.random()*(to)))+from;
		return rand;
	}
	
//collisions
    var BF_checkCollides = function() {
        var loopIndex =  BF_collides.length, 
            element,
            p1, p2,
            p1Top, p1Bottom, p1Left, p1Right,
            p2Top, p2Bottom, p2Left, p2Right;
        
        while(loopIndex--) {
            p1 = BF_collides[loopIndex];
            p1Top = p1.posY + p1.cZ.t;
            p1Bottom = p1.posY + p1.height - p1.cZ.b;
            p1Left = p1.posX + p1.cZ.l;
            p1Right = p1.posX + p1.width - p1.cZ.r;
            
        	for(element in BF_collides[loopIndex].hits){
                p2 = BF_fixedIndexColl[element];
                p2Top = p2.posY + p2.cZ.t;
                p2Bottom = p2.posY + p2.height - p2.cZ.b;
                p2Left = p2.posX + p2.cZ.l;
                p2Right = p2.posX + p2.width - p2.cZ.r;
        
                if (!(
                    (p1Top     > p2Bottom) ||   
                    (p1Bottom  < p2Top)    ||   
                    (p1Left    > p2Right)  ||   
                    (p1Right   < p2Left)
                )){
					BF_collides[loopIndex].hits[element]();
				}
        	}
        
        }
    };
        
//SPRITES    
    var BF_Sprite = function(_image, _width, _height, _frames, _animations) {
        
        var draw = BF_usingCSSAnimations ? function(){ /*console.log(BF_usingCSSAnimations);*/ } : function(){
            //draw DOM
			if (BF_isAndroid) {
				// move bg image
				t.s.background= "url("+ _image + ") no-repeat "+ t.width * t.animation*-1+"px " + t.height * t.f*-1+"px";
			} else {
				//position img // buggy in Android <=2.3
				t.si.top = t.height * t.f*-1+'px';
                t.si.left = t.width * t.animation*-1+'px';
			}
                
            },
            t = {},
            //prepare class for CSS animation
            constructAnimationClass = function(){
                var animationClass = "@" + BF_prefixCSS + "keyframes s"+t.id+" {\n",
                    step = 100/(t.fs+1),
                    str = "% { " + BF_prefixCSS + "transform: translate(";
                for (var q = 0; q < t.fs+1; q++) {
                    animationClass += ~~((step*q)*100)/100+ str +t.animation*t.width*-1+'px,'+q*t.height*-1+'px); }\n';
                    animationClass += ~~((step*(q+1)-0.01)*100)/100+ str +t.animation*t.width*-1+'px,'+q*t.height*-1+'px); }\n';
                }
                
				// for android
                return animationClass += '100'+ str +t.animation*t.width+'px, 0px); }\n}';
                
            };    
        
        t.id = BF_elements.length;
                
        t.image = new Image();
        t.image.src = _image;
    	
		
        t.speed = 1;
        t.width =  _width;
        t.iWidth = _width;
        t.height = _height;
        t.iHeight = _height;
        t.fs = _frames;
        t.animations = _animations;
        t.colllides = false;
        t.hits = {};
                
        t.f = 0;
        t.animation = 0;
        t.speed = 1;
        t.interval = 0;
    
        t.posX = 0;
        t.posY = 0;
    
        t.zOrder = 1;
        
        t.callback = null;
        t.callIters=0;
        t.callMaxIters=0;
        
        //collision zones
        t.cZ = {
            t: 0,
            r: 0,
            b: 0,
            l: 0
        }
            
		t.div = document.createElement('div');
		t.div.id = "sprite"+t.id;
		t.s = t.div.style;	
		
		t.s.overflow = 'hidden';
		t.s.width = _width+'px';
		t.s.height = _height+'px';
		t.s.position = 'absolute';
		t.s.zIndex = t.zOrder;
		
		t.si = t.image.style;
		
		t.si.position="absolute";
		
		if (BF_usingCSSAnimations) {
			//calculate keyframes for CSS animation append keyframe class to the document
			t.animStyle = document.createElement('style');
			t.animStyle.innerHTML = constructAnimationClass();
			document.body.appendChild(t.animStyle);
			
			//additional style attribute for the image,
			t.si[ BF_prefixJS + "Animation" ] = "s"+t.id+" "+calculateSpeed(t.speed, t.fs)+"s linear 0s infinite";
		}
		
		if (BF_isAndroid) {
			t.s.background= "url("+ _image + ") no-repeat 0px 0px";
		} else {
			t.div.appendChild(t.image);
		}
		BF_mainCanvas.appendChild(t.div);

        t.id = BF_elements.push(t)-1;
        BF_fixedIndexColl.push(t); //for collisions, temporary
                
        var setPosition = function(x, y, z) {
            //if there is at least one argument, set position and return 'this' for chaining
            if (x !== undefined) {
                t.posX = x || t.posX;
                t.posY = y || t.posY;
                t.zOrder = z || t.zOrder;
                
               	t.s.zIndex = z || t.zOrder;
				// add hardware acceleration styles or fall back to absolute positioning
				if (has3d) {
					t.s.webkitTransform = "translate3d("+x+"px,"+y+"px,0)";
				} else {
					t.s.left = x+'px';
					t.s.top = y+'px';
				}
									   
                return this;
            } else {
                //method called without parameters, return actual position
                return {x:t.posX, y:t.posY, z:t.zOrder}
            }
        },
        
        setCollide = function(e) {
            if (e && BF_collides.i(t) === -1) {
                BF_collides.push(t);
            } else if (!e && BF_collides.i(t) !== -1){
                rm(t, BF_collides);
            }
        },
        
        onHit = function (object, callback) {
            setCollide(true);
            t.hits[object.id()] = callback;
            if (BF_collides.i(t) === -1) {
                BF_collides.push(t);
            }
            return this;
        };        
        
        t.draw = function() {
            
            if (t.fs > 0) {
                if (t.interval == t.speed && t.speed !== 0) {
                    if (t.f == t.fs) {
                        t.f = 0;
                        
                        if (typeof t.callback === "function") {
                            t.callIters++;
                            if (t.callIters === t.callMaxIters) {
                                t.callback();
                                t.callIters = 0;    
                            } 
                        }  
                    }
                    else {
                        t.f++;
                    }
                    t.interval = 0;
                }
                if (t.speed !== 0) {
                    t.interval++;
                }
                draw();     
            }
        }; 
        var reSize = function(w, h){
            // change size of the sprite
            // return 'this' for chaining
            if (w !== undefined) {
                t.s.width = w+'px';
                t.s.height = h+'px';
                
                t.si.width = w*(t.animations+1)+'px';
                t.si.height = h*(t.fs+1)+'px';
                                    
                t.width = w;
                t.height = h;
                if (BF_usingCSSAnimations) {
                    //refresh animation by clearing and re-apply
                    t.si[ BF_prefixJS+ "AnimationName" ] = '';
                    t.animStyle.innerHTML = constructAnimationClass();
                    t.si[ BF_prefixJS+ "AnimationName" ] = 's'+t.id;
    
                };
                
                return this;
                
            } else {
                
                return {width:t.width,height:t.height};
            }
        };
        
        return {
            'position':setPosition,
            'hit':onHit,
            'zone': function(top, right, bottom, left) {
                if (top !== undefined) {
                    t.cZ.t = top;
                    t.cZ.r = right;
                    t.cZ.b = bottom;
                    t.cZ.l = left;
                    return this;
                } else {
                    return t.cZ;
                }
            },
            'noHits':function() {
                t.hits = {};
                return this;
            },
            'callback':function(fn, iteration) {
                t.callback = fn;
                t.callMaxIters = iteration;
                return this;
            },
            'change': function(image, width, height, frames, animation) {
                if (BF_isAndroid) {
					t.s.background = "url("+ image + ") no-repeat 0px 0px";
				} else {
					t.image.src = image;
				}
				
                t.width = width;
                t.height = height;
                t.iWidth = width;
                t.iHeight = height;
                t.fs = frames;
                t.animation = animation;
                t.interval = 0;
                t.f = 0;
                t.callback = null;
                t.callIters=0;
                t.callMaxIters=0;
                
                t.si.width = width*(t.animation+1)+'px';
				t.si.height = height*(t.fs+1)+'px';
				t.s.width = width+'px';
				t.s.height = height+'px';
				if (BF_usingCSSAnimations) {
				//refresh animation by clearing and re-apply
					t.si[ BF_prefixJS+ "AnimationName" ] = '';
					t.animStyle.innerHTML = constructAnimationClass(); 
					t.si[ BF_prefixJS+ "AnimationName" ] = 's'+t.id;
				}
                
                t.cZ = {
                    t: 0,
                    r: 0,
                    b: 0,
                    l: 0
                }
                
                return this;
            },
            
            'size':reSize,
            'speed':function(e) { 
                if (e !== undefined) { 
                    t.speed=e; 
                    t.interval=0; 
                    if (BF_usingCSSAnimations){
                        t.si[ BF_prefixJS+ "AnimationDuration" ] = calculateSpeed(e, t.fs)+'s';
                    } 
                    
                    return this;
                } else {
                    return t.speed;
                }
            },
            'animation':function(e) { 
                if (e !== undefined) { 
                
                    t.animation=e;  
                    
                    if (BF_usingCSSAnimations) {
                    //refresh animation by clearing and re-apply
                        t.si[ BF_prefixJS+ "AnimationName" ] = '';
                        t.animStyle.innerHTML = constructAnimationClass(); 
                        t.si[ BF_prefixJS+ "AnimationName" ] = 's'+t.id;
                    }
                    
                    return this;
                } else {
                    return t.animation;
                }
            },
            'frame':function(e) { 
                if (e !== undefined) {
                    t.f=e; 
                    return this;
                } else {
                    return t.f;
                }
            },
            'id': function() { return t.id; }
        };
    };

 // Animated Backgrounds
    var BF_Background = function(image, speed, direction, options) {
        
        var draw = function(){
                //draw DOM & Canvas
                // If the values are too close to 0 JS will print them as exponentials which won't work on the DOM.
                var posX = t.posX,
                    posY = t.posY;
                
                if (posX.toString().indexOf('e') != -1) posX = 0;
                if (posY.toString().indexOf('e') != -1) posY = 0;
                BF_mainCanvas.style.backgroundPosition = posX +"px "+posY+"px";    
            },
            t = this;
        
        var setImage = function(img) {
	       BF_mainCanvas.style.backgroundImage = 'url('+img+')';
        };

        setImage(image);
        
        t.speed = speed || 3;
		
		var radsPerDegree = Math.PI / 180,       
        directionFromParameter = function(dir){
            t.dX = 0;
            t.dY = 0;
            if (typeof dir === "string") {
                switch (dir) {
                    case 'N':
                        t.dX = 0;
                        t.dY = -1;
                        break;    
                    case 'W':
                        t.dX = -1;
                        t.dY = 0;
                        break;
                    case 'S':
                        t.dX = 0;
                        t.dY = 1;
                        break;
                    case 'E':
                        t.dX = 1;
                        t.dY = 0;
                        break;                
                    default:
                        break;
                }
            }
            else if (typeof dir === "number") {
                dir =  radsPerDegree * dir; // convert from degrees to radians
                t.dX = Math.cos(dir);
                t.dY = Math.sin(dir);
            }
        }
        
        directionFromParameter(direction);
        
        t.zOrder = options['z'] || 0;
        t.posX = options['x'] || 0;
        t.posY = options['y'] || 0;
        
        t.id = BF_elements.push(t);        
        t.moving = 0;

        var setPosition = function(x, y) {
            if (x !== undefined) {
                t.posX = x || t.posX;
                t.posY = y || t.posY; 
                
                return this;
            } else {
                return {x:t.posX, y:t.posY}
            }
        };
        
        t.draw = function() {
                t.posX += t.speed*t.dX*t.moving;
                t.posY += t.speed*t.dY*t.moving;
                
                draw();
        }
        
        return {
            'on': function() { t.moving = 1; return this;},
            'off': function() { t.moving = 0; return this;},
            'dir': function(direction) { directionFromParameter(direction); return this;},
            'speed':function(e) { if (e !== undefined) { t.speed=e; return this;} else return t.speed;},
            'img': function(img) { if (img !== undefined) { setImage(img); return this;} else return image;},
            'position':setPosition
        }
        
    }
    
    return {
        //config
        'fps': function(holder) {
			(function() {
				function async_load(){
					
					var s = document.createElement('script');
					s.type = 'text/javascript';
					s.async = true;
					s.src = 'stats.js'; // include preffered stats script, not on by default
					var x = document.getElementsByTagName('script')[0];
					x.parentNode.insertBefore(s, x);
					
					setTimeout(function() {
						stats = new Stats();
	
						stats.domElement.style.position = 'absolute';
						stats.domElement.style.right = '0px';
						stats.domElement.style.top = '0px';
						
						var statsHolder = document.getElementById(holder);
						statsHolder.appendChild( stats.domElement );
						
						BF_stats = true;
					}, 1000);
				}
				async_load();
			})();	
			
			return this;
		},
		'controlsOn': function() { BF_controls=true; return this;},
		'scoreOn': function(e) { if (e !== undefined) { maxScore=e; BF_scoring=true; return this; } else return maxScore;},
		'score': function(e) { if (e !== undefined) { score+=e; if (score<0) score=0; return this;} else return score; },
        'init': function() { BF_InitDOM(); BF_InitCore(); return this;},     
        'on': function() { 
            running=true; 
            BF_Start();
            if (BF_usingCSSAnimations){
            //reset animation duration
                var i = BF_elements.length;
                for (;i--;){
                    if (BF_elements[i].image) 
                        BF_elements[i].image.style[ BF_prefixJS+ "AnimationDuration" ] = calculateSpeed(BF_elements[i].speed, BF_elements[i].fs)+'s';
                }
            }
            return this;
        },
        'off': function(){ 
			running=false; 
            BF_Stop();
            if (BF_usingCSSAnimations){
            //stop animations          
                var i = BF_elements.length;
                for (;i--;){
                    if (BF_elements[i].image) 
                        BF_elements[i].image.style[ BF_prefixJS+ "AnimationDuration" ] = 0;
                }
            }
            return this;
        },
		// return game running status to allow replay events
		'running': function(e){ return running; },		
        'canvas': function(){ return BF_mainCanvas; },
        'canvasOff': function() {
            if (typeof BF_parentElement.style.WebkitAnimation !== "undefined") {
               
                // we have webkit CSS3 animation support 
                BF_prefixCSS = "-webkit-";
                BF_prefixJS = "Webkit"; 
                BF_usingCSSAnimations = true;
                  
            } else if (typeof BF_parentElement.style['MozAnimation'] !== "undefined") {
                // Closure Compiler doesn't understand style.MozAnimation so I had to use brackets here and in Firefox
                BF_prefixCSS = "-moz-";
                BF_prefixJS = "Moz";
                BF_usingCSSAnimations = true;
            }
            return this;
        },
        
        'cssAnimationOff': function() {
            BF_usingCSSAnimations=false; 
            return this;
        },
		
        'hitsOn': function() {
            if (BF_addedLoops.i(BF_checkCollides) === -1) 
                BF_addedLoops.push(BF_checkCollides); 
            return this;
        },
        
        'hitsOff': function() { 
            rm(BF_checkCollides, BF_addedLoops); 
            return this;
        },
        
        //elements
        'spr':BF_Sprite,
        'bg': BF_Background,   
		'rnd':BF_Rnd,
		
        //loops
        'hook': function(e){
            BF_addedLoops.push(e); 
            return this;
        },
        
        'unhook': function(e){
            rm(e, BF_addedLoops);
            return this;
        }
        
    };
};
//declaration of Biff object for Closure Compiler
window['Biff'] = Biff;
