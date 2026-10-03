import '../services/api_service.dart';

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

  /// ID YouTube si la vidéo en est une. Un seul champ "media" sert pour
  /// tout : ID brut ou lien complet — même détection que detectYoutubeId()
  /// dans assets/js/posts.js.
  String? get youtubeId {
    final raw = (media?.trim().isNotEmpty == true ? media : youtube)?.trim() ?? '';
    if (raw.isEmpty) return null;
    final link = RegExp(r'(?:youtu\.be/|youtube\.com/(?:watch\?v=|shorts/|embed/))([A-Za-z0-9_-]{11})')
        .firstMatch(raw);
    if (link != null) return link.group(1);
    if (RegExp(r'^[A-Za-z0-9_-]{11}$').hasMatch(raw)) return raw;
    return null;
  }

  /// URL complète d'une vidéo maison (mp4 hébergé sur le serveur).
  String? get videoUrl => youtubeId == null ? ApiConfig.resolveAsset(media) : null;

  /// URL complète de la photo (posts photo).
  String? get photoUrl => isVideo ? null : ApiConfig.resolveAsset(media);

  /// Image à afficher dans la liste : miniature d'une vidéo, ou la photo.
  String? get displayImage {
    if (!isVideo) return photoUrl;
    final thumb = ApiConfig.resolveAsset(thumbnail);
    if (thumb != null) return thumb;
    final yt = youtubeId;
    return yt != null ? 'https://i.ytimg.com/vi/$yt/hqdefault.jpg' : null;
  }

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
