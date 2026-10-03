import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/post.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/cart_badge_icon.dart';
import '../widgets/image_viewer.dart';
import 'settings_screen.dart';
import 'video_player_screen.dart';

class NouveautesScreen extends StatefulWidget {
  const NouveautesScreen({super.key});

  @override
  State<NouveautesScreen> createState() => _NouveautesScreenState();
}

class _NouveautesScreenState extends State<NouveautesScreen> {
  late Future<List<Post>> _future;
  String _filter = 'all'; // all | photo | video

  @override
  void initState() {
    super.initState();
    _future = ApiService.fetchPosts();
  }

  Future<void> _reload() async {
    setState(() {
      _future = ApiService.fetchPosts();
    });
    await _future;
  }

  Future<void> _openPost(Post post) async {
    if (!post.isVideo) {
      final url = post.photoUrl;
      if (url != null) openImageViewer(context, url, title: post.title);
      return;
    }
    // Vidéo maison : lecture directement dans l'appli.
    final videoUrl = post.videoUrl;
    if (videoUrl != null) {
      Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => VideoPlayerScreen(url: videoUrl, title: post.title),
      ));
      return;
    }
    // Vidéo YouTube : ouverture dans l'appli YouTube (ou le navigateur).
    final yt = post.youtubeId;
    if (yt == null) return;
    final uri = Uri.parse('https://www.youtube.com/watch?v=$yt');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Impossible de lire cette vidéo.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nouveautés'),
        actions: const [CartBadgeIcon(), SizedBox(width: 8)],
      ),
      drawer: const AppDrawer(current: 'nouveautes'),
      body: FutureBuilder<List<Post>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.wifi_off, size: 42, color: AppColors.gray),
                    const SizedBox(height: 12),
                    const Text(
                      'Impossible de charger les publications.\n'
                      'Vérifie ta connexion Internet puis réessaie.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.gray),
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 12,
                      alignment: WrapAlignment.center,
                      children: [
                        ElevatedButton(onPressed: _reload, child: const Text('Réessayer')),
                        if (!ApiConfig.isPublicBuild)
                        OutlinedButton(
                          onPressed: () async {
                            final changed = await Navigator.of(context).push<bool>(
                              MaterialPageRoute(builder: (_) => const SettingsScreen()),
                            );
                            if (changed == true) _reload();
                          },
                          child: const Text('Adresse du serveur'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }
          final posts = snapshot.data ?? [];
          final filtered = _filter == 'all'
              ? posts
              : posts.where((p) => p.type == _filter).toList();

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                child: Row(
                  children: [
                    _chip('Tout', 'all'),
                    const SizedBox(width: 8),
                    _chip('Photos', 'photo'),
                    const SizedBox(width: 8),
                    _chip('Vidéos', 'video'),
                  ],
                ),
              ),
              Expanded(
                child: filtered.isEmpty
                    ? const Center(child: Text('Aucune publication.'))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        itemCount: filtered.length,
                        itemBuilder: (context, i) => _PostCard(
                          post: filtered[i],
                          onOpen: () => _openPost(filtered[i]),
                        ),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _chip(String label, String value) {
    final selected = _filter == value;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => setState(() => _filter = value),
      selectedColor: AppColors.green,
      labelStyle: TextStyle(
        color: selected ? Colors.white : AppColors.ink,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}

class _PostCard extends StatelessWidget {
  final Post post;
  final VoidCallback onOpen;

  const _PostCard({required this.post, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      margin: const EdgeInsets.only(bottom: 14),
      child: InkWell(
        onTap: onOpen,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              alignment: Alignment.center,
              children: [
                AspectRatio(
                  aspectRatio: 16 / 10,
                  child: post.displayImage != null
                      ? Image.network(
                          post.displayImage!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) =>
                              Container(color: AppColors.grayLight),
                        )
                      : Container(
                          // Vidéo envoyée sans miniature.
                          color: AppColors.ink,
                          child: const Icon(Icons.movie_outlined,
                              color: Colors.white24, size: 48),
                        ),
                ),
                if (post.isVideo)
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.55),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.play_arrow,
                        color: Colors.white, size: 32),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.yellow,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          post.tag,
                          style: const TextStyle(
                              fontSize: 11, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(post.title,
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 4),
                  Text(post.caption,
                      style: const TextStyle(
                          color: AppColors.gray, fontSize: 13)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
