var pp = {
	'fakX': 190 / 1000 /* X scale from 1000x1000 default size */
	,
	'fakY': 190 / 1000 /* Y scale from 1000x1000 default size */
	,
	'cv': false /* canvas context */
	,
	'gc': [ ] /* buffer gcode */
	,
	'cs': { 'x': 0, 'y': 0, 'p': false } /* cursor state */
	,
	'init': function ( pattern ) {
		pp.cv = document.getElementById( 'preview' ).getContext( '2d' );
		pp.cv.clearRect( 0, 0, pp.cv.canvas.width, pp.cv.canvas.height );
		pp.gc = [ "; Image: " + pattern, "G90 ; Abs Pos", "G21 ; mm units", "G1X0Y0F9000 ; Home-Feedrate" ];
		document.getElementById( 'infozone' ).innerHTML = 'Scaling to basic size of ' + ( pp.fakX * 1000 ).toFixed( 2 ) + " mm x " + ( pp.fakX * 1000 ).toFixed( 2 ) + " mm";
	}
	,
	'readimage': function ( ev ) {
		ev = ev || window.event;
		try {
			var ctx = document.getElementById( 'mycanvas' ).getContext( '2d' );
			var img = new Image;
			img.onload = function () {
				var x, y, w, h;
				w = img.width;
				h = img.height;
				if ( w > h ) {
					w = 200 * w / h;
					h = 200;
					x = ( 200 - w ) / 2;
					y = 0;
				} else {
					h = 200 * h / w;
					w = 200;
					x = 0;
					y = ( 200 - h ) / 2;
				}
				ctx.drawImage( img, x, y, w, h );
				URL.revokeObjectURL( img.src );
			}
			img.src = URL.createObjectURL( ev.target.files[0] );
		} catch ( e ) {

		}
	}
	,
	'pic_lineart': function () {
		var stepX = 2;
		var stepY = 1;
		var exciter = 5;
		pp.init( "pic_lineart" );
		var ctx = document.getElementById( 'mycanvas' ).getContext( '2d' );
		for ( var y = 0; y < ctx.canvas.height; y = y + stepY ) {
			pp.pu();
			pp.m( 0, 5 * ( y + stepY / 2 ) );
			for ( var x = 0; x < ctx.canvas.width; x = x + stepX ) {
				var idat = 255 - ctx.getImageData( x, ctx.canvas.height - y, 1, 1 ).data[1];
				if ( idat < 20 ) {
					pp.pu();
					pp.m( 5 * ( x + stepX ), 5 * ( y + stepY / 2 ) );
					continue;
				}
				pp.l( 5 * x, 5 * ( y + stepY / 2 ) + ( idat / 255 * exciter ) );
				pp.l( 5 * ( x + stepX / 2 ), 5 * ( y + stepY / 2 ) - idat / 255 * exciter );
			}
			pp.pu();
		}
		pp.m( 0, 0 );
		pp.gcodedump();
		console.log( "done" );
	}
	,
	'pic_pixelize': function () {
		var stepX = 2;
		var stepY = 2;
		var exciter = 1/256;
		pp.init( "pic_pixelize" );
		var ctx = document.getElementById( 'mycanvas' ).getContext( '2d' );
		for ( var lev = 24; lev < 256; lev = lev + 24 ) {
			pp.pu();
			pp.m( 0, 0 );
			for ( var y = 0; y < ctx.canvas.height -1 ; y = y + stepY ) {
				var py = 5 * ( y + lev * exciter );
				pp.pu();
				pp.m( 0, py );
				for ( var x = 0; x < ctx.canvas.width; x = x + stepX ) {
					var idat = 255 - ctx.getImageData( x, ctx.canvas.height - y, 1, 1 ).data[1];
					if ( idat < lev ) {
						pp.pu();
						pp.m( 5 * ( x + stepX ), py );
						continue;
					}
					pp.l( 5 * x, py );
				}
				pp.pu();
			}
		}
		pp.m( 0, 0 );
		pp.gcodedump();
		console.log( "done" );
	}
	,
	'pic_sawtoothV': function () {
		pp.init( "pic_lineart" );
		var ctx = document.getElementById( 'mycanvas' ).getContext( '2d' );
		for ( var x = 0; x < ctx.canvas.width; x = x + 2 ) {
			pp.pu();
			pp.m( 5 * x, 0 );
			for ( var y = 0; y < ctx.canvas.height; y = y + 2 ) {
				var idat = ctx.getImageData( x, ctx.canvas.height - y, 1, 1 );
				pp.l( 5 * x, 5 * y );
				pp.l( 5 * x + ( ( 255 - idat.data[1] ) / 32 ), 5 * y );
			}
			pp.pu();
		}
		pp.gcodedump();
		console.log( "done" );
	}
	,
	'gcodedump': function ( ) {
		document.getElementById( 'gcode' ).innerHTML = '<pre>' + pp.gc.join( "\r" ) + '</pre>';
		var text = document.getElementById( 'gcode' )
				, range, selection
				;
		if ( document.body.createTextRange ) {
			range = document.body.createTextRange( );
			range.moveToElementText( text );
			range.select( );
		} else if ( window.getSelection ) {
			selection = window.getSelection( );
			range = document.createRange( );
			range.selectNodeContents( text );
			selection.removeAllRanges( );
			selection.addRange( range );
		}


	}
	,
	/**
	 * Move (no drawing) cursor to 
	 * @param {type} x
	 * @param {type} y
	 * @returns {undefined}
	 */
	'm': function ( x, y ) {
		pp.mo( { 'x': x, 'y': y } );
	}
	,
	/**
	 * Move (no drawing) cursor to coordinate c (with c.x and c.y)
	 * @param {type} c
	 * @returns {undefined}
	 */
	'mo': function ( c ) {
		pp.pu();
		pp.gc.push( "G0X" + ( c.x * pp.fakX ).toFixed( 4 ) + "Y" + ( c.y * pp.fakY ).toFixed( 4 ) );
		pp.cv.moveTo( c.x, 1000 - c.y );
		pp.cs.x = c.x;
		pp.cs.y = c.y;

	}
	,
	/**
	 * Draw line from current to new position
	 * @param {type} x
	 * @param {type} y
	 * @returns {undefined}
	 */
	'l': function ( x, y ) {
		pp.lo( { 'x': x, 'y': y } );
	},
	/**
	 * Draw line from current to new position c (with c.x and c.y)
	 * @param {type} c
	 * @returns {undefined}
	 */
	'lo': function ( c ) {
		pp.pd();
		pp.gc.push( "G1X" + ( c.x * pp.fakX ).toFixed( 4 ) + "Y" + ( c.y * pp.fakY ).toFixed( 4 ) );
		pp.cv.lineTo( c.x, 1000 - c.y );
		pp.cs.x = c.x;
		pp.cs.y = c.y;

	}
	,
	/**
	 * 
	 * Change Pen State (if necessary): down = true 
	 * @param {type} down
	 * @returns {Boolean}
	 */
	'p': function ( newState ) {
		if ( pp.cs.p == newState ) {
			return true;
		}
		pp.cs.p = newState;
		if ( newState == true ) {
			pp.gc.push( "G0Z-10" );
			pp.cv.beginPath( );
			pp.cv.moveTo( pp.cs.x, 1000 - pp.cs.y );

		} else {
			pp.gc.push( "G0Z0" );
			pp.cv.stroke( );

		}
	}
	,
	/**
	 * Pen Down Command
	 * @returns {undefined}
	 */
	'pd': function () {
		pp.p( true );
	}
	,
	/**
	 * Pen Up Command
	 * @returns {undefined}
	 */
	'pu': function () {
		pp.p( false );
	}
	,
	/**
	 * Draw rotating lines
	 * @returns {pp.rotalines}
	 */
	'rotalines': function ( ) {
		pp.init( "rotalines" );
		calc = function ( major, minor ) {

			return {
				'x': 250 + 0 * major + ( ( 100 + 2 * major ) * Math.sin( ( Math.PI + 1 ) * minor / 180 ) )
				,
				'y': 500 + ( ( 200 + 2 * major ) * Math.cos( ( 1 + Math.PI ) * minor / 180 ) )
			};
		}

		for ( var major = 0; major <= 100; major = major + 5 ) {

			pp.mo( calc( major, 0 ) );
			for ( var minor = 0; minor <= 36; minor++ ) {
				pp.lo( calc( major, minor * major / 10 ) );
			}
			pp.pu( );
		}

		pp.gcodedump( );
	}
	,
	/**
	 * 
	 * @returns {pp.rotacubes}
	 */
	'rotapoly': function ( faces ) {
		pp.init( "rotapoly" + faces.toString() );
		var calc = function ( major, minor ) {

			return {
				'x': 500 + ( 100 + major ) * Math.sin( Math.PI * ( major + minor ) / 180 )
				,
				'y': 500 + ( 100 + major ) * Math.cos( Math.PI * ( major + minor ) / 180 )
			};
		}

		for ( var major = 0; major <= 360; major = major + 5 ) {
			pp.mo( calc( major, 0 ) );

			for ( var minor = 1; minor <= faces; minor++ ) {
				pp.lo( calc( major, minor * 360 / faces ) );
			}

		}
		pp.p( false );

		pp.gcodedump( );
	}
	,
	/**
	 * 
	 * 
	 * 
	 * Paint a Grid
	 * @returns {undefined}
	 */
	'grid': function ( ) {
		pp.init( "grid" );
		pp.pu();
		for ( var x = 0; x <= 990; x = x + 50 ) {
			pp.m( x, 0 );
			pp.l( x, 1000 );
			pp.m( x + 25, 1000 );
			pp.l( x + 25, 0 );
		}

		for ( var x = 0; x <= 990; x = x + 50 ) {
			pp.m( 0, x );
			pp.l( 1000, x );
			pp.m( 1000, x + 25 );
			pp.l( 0, x + 25 );
		}

		pp.m( 1000, 0 );
		pp.l( 1000, 1000 );
		pp.l( 0, 1000 );
		pp.pu();

		pp.gcodedump( );
	}
	,
	/**
	 * Draw Variations of Sine
	 * @returns {undefined}
	 */
	'sines': function () {
		pp.init( "Sines" );

		var calc = function ( x, y ) {
			var d = Math.sqrt( ( x - 500 ) * ( x - 500 ) + ( y - 500 ) * ( y - 500 ) );
			return {
				'x': x + 100 * Math.cos( ( 500 - y ) * 3.141 / 600 )
				,
				'y': y - 4 * 800 / ( d + 10 ) * Math.cos( d * 3.141 / 40 ) + ( ( d + 300 - x ) / 100 * Math.random() )

			};
		}

		var minx = 100;

		for ( var y = 100; y < 900; y = y + 5 ) {
			pp.mo( calc( minx, y ) );
			pp.pd();
			for ( var x = minx; x < 1000 - minx; x = x + 5 ) {
				pp.lo( calc( x, y ) );
			}
			pp.pu();
		}

		pp.gcodedump();

	}
	,
	/**
	 * Draw Spiral
	 * @returns {undefined}
	 */
	'spiral': function () {
		pp.init( "Spiral" );

		var calc = function ( i ) {
			return {
				'x': 500 + i * Math.cos( i * 3.141 / 10 )
				,
				'y': 500 + i * Math.sin( i * 3.141 / 10 )

			};
		}


		var mini = 100;

		pp.mo( calc( mini ) );
		pp.pd();
		for ( var i = mini; i < 500; i = i + .1 ) {
			pp.lo( calc( i ) );
		}
		pp.pu();
		pp.m( 0, 0 );

		pp.gcodedump();

	}
	,
	/**
	 * Draw Calibration Corners
	 * @returns {undefined}
	 */
	'corners': function () {
		pp.init( "CalibCorners" );

		var calc = function ( i, o, br ) {
			return {
				'x': 500 + ( br + 20 * Math.abs( o ) ) * Math.cos( ( i + 10 * ( o % 2 ) ) * 3.141 / 180 )
				,
				'y': 500 + ( br + 20 * Math.abs( o ) ) * Math.sin( ( i + 10 * ( o % 2 ) ) * 3.141 / 180 )

			};
		}

		var steps = 22;
		var br = 50;

		for ( var i = 0; i < 360; i = i + 20 ) {
			pp.mo( calc( i, 0, br ) );
			for ( var j = 1; j < steps; j++ ) {
				pp.lo( calc( i, j, br ) );
				pp.lo( calc( i, j, br ) );
			}
			pp.pu();
			pp.mo( calc( i, 0, br ) );
			for ( var j = 1; j < steps; j++ ) {
				pp.lo( calc( i, -j, br ) );
				pp.lo( calc( i, -j, br ) );
			}
			pp.pu();
		}
		pp.m( 0, 0 );

		pp.gcodedump();

	}

}

pp.init( );

