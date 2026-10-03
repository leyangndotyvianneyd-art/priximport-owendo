import 'dart:async';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

/// Lecteur plein écran pour les vidéos maison (mp4 servis par server.js).
/// Les vidéos YouTube, elles, s'ouvrent dans l'appli YouTube.
class VideoPlayerScreen extends StatefulWidget {
  final String url;
  final String? title;

  const VideoPlayerScreen({super.key, required this.url, this.title});

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> {
  late final VideoPlayerController _controller;
  bool _error = false;
  bool _showControls = true;
  Timer? _hideTimer;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.url))
      ..addListener(() {
        if (mounted) setState(() {});
      });
    _controller.initialize().then((_) {
      _controller.play();
      _scheduleHide();
    }).catchError((_) {
      if (mounted) setState(() => _error = true);
    });
  }

  @override
  void dispose() {
    _hideTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _scheduleHide() {
    _hideTimer?.cancel();
    _hideTimer = Timer(const Duration(seconds: 3), () {
      if (mounted && _controller.value.isPlaying) {
        setState(() => _showControls = false);
      }
    });
  }

  void _togglePlay() {
    final v = _controller.value;
    if (v.isPlaying) {
      _controller.pause();
    } else {
      if (v.position >= v.duration) _controller.seekTo(Duration.zero);
      _controller.play();
    }
    setState(() => _showControls = true);
    _scheduleHide();
  }

  String _fmt(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final v = _controller.value;
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        elevation: 0,
        title: widget.title != null
            ? Text(widget.title!,
                style: const TextStyle(color: Colors.white, fontSize: 16))
            : null,
      ),
      body: Center(
        child: _error
            ? const Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Impossible de lire cette vidéo.\n'
                  'Vérifie la connexion au serveur.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70),
                ),
              )
            : !v.isInitialized
                ? const CircularProgressIndicator(color: Colors.white)
                : GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () {
                      setState(() => _showControls = !_showControls);
                      if (_showControls) _scheduleHide();
                    },
                    child: AspectRatio(
                      aspectRatio: v.aspectRatio,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          VideoPlayer(_controller),
                          if (v.isBuffering)
                            const CircularProgressIndicator(color: Colors.white),
                          AnimatedOpacity(
                            opacity: _showControls ? 1 : 0,
                            duration: const Duration(milliseconds: 200),
                            child: IgnorePointer(
                              ignoring: !_showControls,
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  Container(color: Colors.black26),
                                  IconButton(
                                    iconSize: 64,
                                    color: Colors.white,
                                    onPressed: _togglePlay,
                                    icon: Icon(v.isPlaying
                                        ? Icons.pause_circle_filled
                                        : Icons.play_circle_filled),
                                  ),
                                  Positioned(
                                    left: 12,
                                    right: 12,
                                    bottom: 8,
                                    child: Row(
                                      children: [
                                        Text(_fmt(v.position),
                                            style: const TextStyle(
                                                color: Colors.white, fontSize: 12)),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: VideoProgressIndicator(
                                            _controller,
                                            allowScrubbing: true,
                                            padding: const EdgeInsets.symmetric(
                                                vertical: 10),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(_fmt(v.duration),
                                            style: const TextStyle(
                                                color: Colors.white, fontSize: 12)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
      ),
    );
  }
}
