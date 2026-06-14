import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../theme/tokens.dart';

/// Google Maps location picker in a WebView (no native map module needed).
/// Pass the key with `--dart-define=GOOGLE_MAPS_KEY=...`; without it the host
/// screen should rely on the manual address field (this renders a notice).
const _mapsKey = String.fromEnvironment('GOOGLE_MAPS_KEY');

class PickedLocation {
  final double latitude;
  final double longitude;
  final String address;
  PickedLocation(this.latitude, this.longitude, this.address);
}

class LocationPicker extends StatefulWidget {
  final void Function(PickedLocation) onPick;
  const LocationPicker({super.key, required this.onPick});

  @override
  State<LocationPicker> createState() => _LocationPickerState();
}

class _LocationPickerState extends State<LocationPicker> {
  WebViewController? _controller;

  @override
  void initState() {
    super.initState();
    if (_mapsKey.isEmpty) return;
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel('Location', onMessageReceived: (msg) {
        try {
          final m = jsonDecode(msg.message) as Map<String, dynamic>;
          widget.onPick(PickedLocation(
            (m['latitude'] as num).toDouble(),
            (m['longitude'] as num).toDouble(),
            (m['address'] as String?) ?? '',
          ));
        } catch (_) {
          /* ignore malformed messages */
        }
      })
      ..loadHtmlString(_html(_mapsKey));
  }

  @override
  Widget build(BuildContext context) {
    if (_controller == null) {
      return Container(
        height: 90,
        alignment: Alignment.center,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: T.panel,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: T.line),
        ),
        child: Text('Map unavailable — enter your address below.',
            textAlign: TextAlign.center, style: bodyText(12, color: T.inkMuted)),
      );
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: SizedBox(height: 240, child: WebViewWidget(controller: _controller!)),
    );
  }
}

String _html(String key) => '''
<!doctype html><html><head><meta name="viewport" content="initial-scale=1.0,maximum-scale=1.0"/>
<style>html,body,#map{height:100%;margin:0}#s{box-sizing:border-box;width:92%;margin:8px 4%;padding:10px;border:1px solid #ccc;border-radius:8px;font-size:15px;position:absolute;z-index:5;top:0;left:0}</style></head>
<body><input id="s" placeholder="Search address"/><div id="map"></div>
<script>
let map,marker,geo;
function post(lat,lng,a){Location.postMessage(JSON.stringify({latitude:lat,longitude:lng,address:a||''}));}
function rev(ll){geo.geocode({location:ll},(r,s)=>post(ll.lat(),ll.lng(),(s==='OK'&&r[0])?r[0].formatted_address:''));}
function mark(ll){if(!marker){marker=new google.maps.Marker({map,position:ll,draggable:true});marker.addListener('dragend',()=>rev(marker.getPosition()));}else marker.setPosition(ll);}
function initMap(){const c={lat:30.0444,lng:31.2357};map=new google.maps.Map(document.getElementById('map'),{center:c,zoom:11,disableDefaultUI:true,zoomControl:true});geo=new google.maps.Geocoder();
map.addListener('click',e=>{mark(e.latLng);rev(e.latLng);});
const ac=new google.maps.places.Autocomplete(document.getElementById('s'),{fields:['geometry','formatted_address']});
ac.addListener('place_changed',()=>{const p=ac.getPlace();if(!p.geometry)return;map.panTo(p.geometry.location);map.setZoom(15);mark(p.geometry.location);post(p.geometry.location.lat(),p.geometry.location.lng(),p.formatted_address);});}
</script>
<script async src="https://maps.googleapis.com/maps/api/js?key=$key&libraries=places&callback=initMap"></script>
</body></html>''';
