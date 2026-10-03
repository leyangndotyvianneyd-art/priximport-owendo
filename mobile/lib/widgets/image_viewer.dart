import 'package:flutter/material.dart';

/// Ouvre une image en plein écran, avec zoom à deux doigts et double-tap —
/// équivalent de la lightbox "click-to-zoom" du site web.
void openImageViewer(BuildContext context, String url, {String? title}) {
  Navigator.of(context).push(
    PageRouteBuilder(
      opaque: false,
      barrierColor: Colors.black,
      pageBuilder: (_, __, ___) => ImageViewerScreen(url: url, title: title),
      transitionsBuilder: (_, anim, __, child) =>
          FadeTransition(opacity: anim, child: child),
    ),
  );
}

class ImageViewerScreen extends StatefulWidget {
  final String url;
  final String? title;

  const ImageViewerScreen({super.key, required this.url, this.title});

  @override
  State<ImageViewerScreen> createState() => _ImageViewerScreenState();
}

class _ImageViewerScreenState extends State<ImageViewerScreen>
    with SingleTickerProviderStateMixin {
  final _controller = TransformationController();
  late final AnimationController _anim;
  Animation<Matrix4>? _zoomAnim;
  TapDownDetails? _doubleTap;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 220))
      ..addListener(() => _controller.value = _zoomAnim!.value);
  }

  @override
  void dispose() {
    _anim.dispose();
    _controller.dispose();
    super.dispose();
  }

  // Double-tap : zoom x2.5 sur le point touché, ou retour à la taille normale.
  void _onDoubleTap() {
    final zoomed = _controller.value.getMaxScaleOnAxis() > 1.01;
    final Matrix4 end;
    if (zoomed) {
      end = Matrix4.identity();
    } else {
      final p = _doubleTap!.localPosition;
      const s = 2.5;
      end = Matrix4.identity()
        ..translateByDouble(-p.dx * (s - 1), -p.dy * (s - 1), 0, 1)
        ..scaleByDouble(s, s, 1, 1);
    }
    _zoomAnim = Matrix4Tween(begin: _controller.value, end: end)
        .animate(CurvedAnimation(parent: _anim, curve: Curves.easeOut));
    _anim.forward(from: 0);
  }

  @override
  Widget build(BuildContext context) {
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
      body: GestureDetector(
        onDoubleTapDown: (d) => _doubleTap = d,
        onDoubleTap: _onDoubleTap,
        child: InteractiveViewer(
          transformationController: _controller,
          minScale: 1,
          maxScale: 5,
          child: SizedBox.expand(
            child: Image.network(
              widget.url,
              fit: BoxFit.contain,
              loadingBuilder: (_, child, progress) => progress == null
                  ? child
                  : const Center(
                      child: CircularProgressIndicator(color: Colors.white)),
              errorBuilder: (_, __, ___) => const Center(
                child: Text("Impossible d'afficher l'image.",
                    style: TextStyle(color: Colors.white70)),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
