import {
	EventDispatcher,
	MOUSE,
	Quaternion,
	Vector2,
	Vector3
} from '../three.module.js';

// TrackballControls performs orbiting, zooming, and panning with full roll support.
// Based on THREE.TrackballControls from three.js examples.

class TrackballControls extends EventDispatcher {
	constructor( object, domElement ) {
		super();

		if ( domElement === undefined ) console.warn( 'THREE.TrackballControls: The second parameter "domElement" is now mandatory.' );
		if ( domElement === document ) console.error( 'THREE.TrackballControls: "document" should not be used as the target "domElement". Please use "renderer.domElement" instead.' );

		this.object = object;
		this.domElement = domElement;

		// API
		this.enabled = true;

		this.screen = { left: 0, top: 0, width: 0, height: 0 };

		this.rotateSpeed = 4.0;
		this.zoomSpeed = 1.2;
		this.panSpeed = 0.3;

		this.noRotate = false;
		this.noZoom = false;
		this.noPan = false;

		this.staticMoving = false;
		this.dynamicDampingFactor = 0.2;

		this.minDistance = 0;
		this.maxDistance = Infinity;

		this.keys = [ 'KeyA', 'KeyS', 'KeyD' ];
		this.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };

		this.target = new Vector3();

		const EPS = 0.000001;

		const lastPosition = new Vector3();
		const lastQuaternion = new Quaternion();

		const _state = { NONE: - 1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM_PAN: 4 };
		let state = _state.NONE;

		const _eye = new Vector3();

		const _movePrev = new Vector2();
		const _moveCurr = new Vector2();

		const _lastAxis = new Vector3();
		let _lastAngle = 0;

		const _zoomStart = new Vector2();
		const _zoomEnd = new Vector2();

		let _touchZoomDistanceStart = 0;
		let _touchZoomDistanceEnd = 0;

		const _panStart = new Vector2();
		const _panEnd = new Vector2();

		const _pointers = [];
		const _pointerPositions = {};

		const changeEvent = { type: 'change' };
		const startEvent = { type: 'start' };
		const endEvent = { type: 'end' };

		this.handleResize = () => {
			const rect = this.domElement.getBoundingClientRect();
			this.screen.left = rect.left;
			this.screen.top = rect.top;
			this.screen.width = rect.width;
			this.screen.height = rect.height;
		};

		this.handleResize();

		const getMouseOnScreen = ( pageX, pageY ) => new Vector2(
			( pageX - this.screen.left ) / this.screen.width,
			( pageY - this.screen.top ) / this.screen.height
		);

		const getMouseOnCircle = ( pageX, pageY ) => new Vector2(
			( ( pageX - this.screen.width * 0.5 - this.screen.left ) / ( this.screen.width * 0.5 ) ),
			( ( this.screen.height + 2 * ( this.screen.top - pageY ) ) / this.screen.width )
		);

		this.rotateCamera = () => {
			const moveDirection = new Vector3(
				_moveCurr.x - _movePrev.x,
				_moveCurr.y - _movePrev.y,
				0
			);

			let angle = moveDirection.length();

			if ( angle ) {
				_eye.copy( this.object.position ).sub( this.target );

				const eyeDirection = _eye.clone().normalize();
				const objectUpDirection = this.object.up.clone().normalize();
				const objectSidewaysDirection = new Vector3().crossVectors( objectUpDirection, eyeDirection ).normalize();

				objectUpDirection.setLength( _moveCurr.y - _movePrev.y );
				objectSidewaysDirection.setLength( _moveCurr.x - _movePrev.x );

				const moveDirection = objectUpDirection.add( objectSidewaysDirection );

				const axis = new Vector3().crossVectors( moveDirection, _eye ).normalize();

				angle *= this.rotateSpeed;
				const quaternion = new Quaternion();
				quaternion.setFromAxisAngle( axis, angle );

				_eye.applyQuaternion( quaternion );
				this.object.up.applyQuaternion( quaternion );

				_lastAxis.copy( axis );
				_lastAngle = angle;
			} else if ( ! this.staticMoving && _lastAngle ) {
				_lastAngle *= Math.sqrt( 1.0 - this.dynamicDampingFactor );
				_eye.copy( this.object.position ).sub( this.target );

				const quaternion = new Quaternion();
				quaternion.setFromAxisAngle( _lastAxis, _lastAngle );
				_eye.applyQuaternion( quaternion );
				this.object.up.applyQuaternion( quaternion );
			}

			_movePrev.copy( _moveCurr );
		};

		this.zoomCamera = () => {
			let factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * this.zoomSpeed;

			if ( factor !== 1.0 && factor > 0.0 ) {
				_eye.multiplyScalar( factor );
			}

			if ( this.staticMoving ) {
				_zoomStart.copy( _zoomEnd );
			} else {
				_zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;
			}
		};

		this.panCamera = () => {
			const mouseChange = _panEnd.clone().sub( _panStart );

			if ( mouseChange.lengthSq() ) {
				mouseChange.multiplyScalar( _eye.length() * this.panSpeed );

				const pan = _eye.clone().cross( this.object.up ).setLength( mouseChange.x );
				pan.add( this.object.up.clone().setLength( mouseChange.y ) );

				this.object.position.add( pan );
				this.target.add( pan );

				if ( this.staticMoving ) {
					_panStart.copy( _panEnd );
				} else {
					_panStart.add( mouseChange.subVectors( _panEnd, _panStart ).multiplyScalar( this.dynamicDampingFactor ) );
				}
			}
		};

		this.checkDistances = () => {
			if ( ! this.noZoom || ! this.noPan ) {
				if ( _eye.lengthSq() > this.maxDistance * this.maxDistance ) {
					this.object.position.addVectors( this.target, _eye.setLength( this.maxDistance ) );
					_zoomStart.copy( _zoomEnd );
				}

				if ( _eye.lengthSq() < this.minDistance * this.minDistance ) {
					this.object.position.addVectors( this.target, _eye.setLength( this.minDistance ) );
					_zoomStart.copy( _zoomEnd );
				}
			}
		};

		this.update = () => {
			_eye.subVectors( this.object.position, this.target );

			if ( ! this.noRotate ) {
				this.rotateCamera();
			}

			if ( ! this.noZoom ) {
				this.zoomCamera();
			}

			if ( ! this.noPan ) {
				this.panCamera();
			}

			this.object.position.addVectors( this.target, _eye );

			this.checkDistances();

			this.object.lookAt( this.target );

			if ( lastPosition.distanceToSquared( this.object.position ) > EPS || 8 * ( 1 - lastQuaternion.dot( this.object.quaternion ) ) > EPS ) {
				this.dispatchEvent( changeEvent );
				lastPosition.copy( this.object.position );
				lastQuaternion.copy( this.object.quaternion );
			}
		};

		this.reset = () => {
			state = _state.NONE;

			this.target.set( 0, 0, 0 );
			this.object.position.set( 0, 0, 1 );
			this.object.up.set( 0, 1, 0 );

			_eye.subVectors( this.object.position, this.target );

			this.object.lookAt( this.target );

			this.dispatchEvent( changeEvent );

			lastPosition.copy( this.object.position );
			lastQuaternion.copy( this.object.quaternion );
		};

		const onPointerDown = ( event ) => {
			if ( this.enabled === false ) return;

			if ( _pointers.length === 0 ) {
				this.domElement.setPointerCapture( event.pointerId );
				this.domElement.addEventListener( 'pointermove', onPointerMove );
				this.domElement.addEventListener( 'pointerup', onPointerUp );
			}

			addPointer( event );

			if ( event.pointerType === 'touch' ) {
				switch ( _pointers.length ) {
					case 1:
						state = _state.TOUCH_ROTATE;
						_moveCurr.copy( getMouseOnCircle( event.pageX, event.pageY ) );
						_movePrev.copy( _moveCurr );
						break;

					case 2:
						state = _state.TOUCH_ZOOM_PAN;
						const dx = _pointers[ 0 ].pageX - _pointers[ 1 ].pageX;
						const dy = _pointers[ 0 ].pageY - _pointers[ 1 ].pageY;
						_touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy );
						_touchZoomDistanceStart = _touchZoomDistanceEnd;

						const x = ( _pointers[ 0 ].pageX + _pointers[ 1 ].pageX ) / 2;
						const y = ( _pointers[ 0 ].pageY + _pointers[ 1 ].pageY ) / 2;
						_panStart.copy( getMouseOnScreen( x, y ) );
						_panEnd.copy( _panStart );
						break;
				}
			} else {
				switch ( event.button ) {
					case 0:
						switch ( this.mouseButtons.LEFT ) {
							case MOUSE.ROTATE:
								state = _state.ROTATE;
								_moveCurr.copy( getMouseOnCircle( event.pageX, event.pageY ) );
								_movePrev.copy( _moveCurr );
								break;

							case MOUSE.PAN:
								state = _state.PAN;
								_panStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
								_panEnd.copy( _panStart );
								break;
							case MOUSE.DOLLY:
								state = _state.ZOOM;
								_zoomStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
								_zoomEnd.copy( _zoomStart );
								break;
						}
						break;

					case 1:
						state = _state.ZOOM;
						_zoomStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
						_zoomEnd.copy( _zoomStart );
						break;

					case 2:
						state = _state.PAN;
						_panStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
						_panEnd.copy( _panStart );
						break;
				}
			}

			if ( state !== _state.NONE ) {
				this.dispatchEvent( startEvent );
			}
		};

		const onPointerMove = ( event ) => {
			if ( this.enabled === false ) return;

			if ( event.pointerType === 'touch' ) {
				switch ( state ) {
					case _state.TOUCH_ROTATE:
						_moveCurr.copy( getMouseOnCircle( event.pageX, event.pageY ) );
						break;

					case _state.TOUCH_ZOOM_PAN:
						const dx = _pointers[ 0 ].pageX - _pointers[ 1 ].pageX;
						const dy = _pointers[ 0 ].pageY - _pointers[ 1 ].pageY;
						_touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy );

						const x = ( _pointers[ 0 ].pageX + _pointers[ 1 ].pageX ) / 2;
						const y = ( _pointers[ 0 ].pageY + _pointers[ 1 ].pageY ) / 2;
						_panEnd.copy( getMouseOnScreen( x, y ) );
						break;
				}
			} else {
				switch ( state ) {
					case _state.ROTATE:
						_moveCurr.copy( getMouseOnCircle( event.pageX, event.pageY ) );
						break;

					case _state.ZOOM:
						_zoomEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );
						break;

					case _state.PAN:
						_panEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );
						break;
				}
			}
		};

		const onPointerUp = ( event ) => {
			if ( this.enabled === false ) return;

			removePointer( event );

			if ( _pointers.length === 0 ) {
				this.domElement.releasePointerCapture( event.pointerId );
				this.domElement.removeEventListener( 'pointermove', onPointerMove );
				this.domElement.removeEventListener( 'pointerup', onPointerUp );
			}

			state = _state.NONE;
			this.dispatchEvent( endEvent );
		};

		const onMouseWheel = ( event ) => {
			if ( this.enabled === false ) return;
			if ( this.noZoom === true ) return;
			event.preventDefault();

			switch ( event.deltaMode ) {
				case 2:
					_zoomStart.y -= event.deltaY * 0.025;
					break;

				case 1:
					_zoomStart.y -= event.deltaY * 0.01;
					break;

				default:
					_zoomStart.y -= event.deltaY * 0.00025;
			}
		};

		const onKeyDown = ( event ) => {
			if ( this.enabled === false ) return;
			if ( this.noPan === true ) return;

			switch ( event.code ) {
				case this.keys[ 0 ]:
					_panStart.y += 0.01;
					break;
				case this.keys[ 1 ]:
					_panStart.y -= 0.01;
					break;
				case this.keys[ 2 ]:
					_panStart.x -= 0.01;
					break;
			}
		};

		const addPointer = ( event ) => {
			_pointers.push( event );
			_pointerPositions[ event.pointerId ] = new Vector2( event.pageX, event.pageY );
		};

		const removePointer = ( event ) => {
			delete _pointerPositions[ event.pointerId ];

			for ( let i = 0; i < _pointers.length; i ++ ) {
				if ( _pointers[ i ].pointerId === event.pointerId ) {
					_pointers.splice( i, 1 );
					return;
				}
			}
		};

		const onContextMenu = ( event ) => event.preventDefault();
		this.domElement.addEventListener( 'contextmenu', onContextMenu );
		this.domElement.addEventListener( 'pointerdown', onPointerDown );
		this.domElement.addEventListener( 'wheel', onMouseWheel, { passive: false } );
		this.domElement.addEventListener( 'keydown', onKeyDown );

		this.dispose = () => {
			this.domElement.removeEventListener( 'contextmenu', onContextMenu );
			this.domElement.removeEventListener( 'pointerdown', onPointerDown );
			this.domElement.removeEventListener( 'wheel', onMouseWheel );
			this.domElement.removeEventListener( 'keydown', onKeyDown );
			this.domElement.removeEventListener( 'pointermove', onPointerMove );
			this.domElement.removeEventListener( 'pointerup', onPointerUp );
		};
	}
}

export { TrackballControls };
