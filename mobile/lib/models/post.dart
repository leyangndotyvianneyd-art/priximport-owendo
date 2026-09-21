/// Modèle publication (page Nouveautés) — mêmes champs que
/// data/posts.json / assets/js/posts-data.js côté site web.
class Post {
  final String id;
  final String type; // "photo" ou "video"
  final String title;
  final String caption;
  final String tag;
  final String date;
  final String? media; // photo, ou vidéo maison (mp4)
  final String? youtube; // ID de la vidéo YouTube
  final String? thumbnail; // miniature pour les posts vidéo

  Post({
    required this.id,
    required this.type,
    required this.title,
    required this.caption,
    required this.tag,
    required this.date,
    this.media,
    this.youtube,
    this.thumbnail,
  });

  bool get isVideo => type == 'video';

  /// Image à afficher dans la grille (miniature pour une vidéo, photo sinon).
  String? get displayImage => isVideo ? (thumbnail ?? media) : media;

  factory Post.fromJson(Map<String, dynamic> json) {
    return Post(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? 'photo',
      title: json['title']?.toString() ?? '',
      caption: json['caption']?.toString() ?? '',
      tag: json['tag']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      media: json['media']?.toString(),
      youtube: json['youtube']?.toString(),
      thumbnail: json['thumbnail']?.toString(),
    );
  }
}
