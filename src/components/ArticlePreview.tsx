import { X, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Article {
  url: string;
  title: string;
  markdown: string;
  screenshot?: string;
}

interface ArticlePreviewProps {
  article: Article;
  onClear: () => void;
  onRefresh: () => void;
}

export const ArticlePreview = ({ article, onClear, onRefresh }: ArticlePreviewProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground line-clamp-2">{article.title}</h4>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="truncate">{article.url}</span>
          </a>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={onRefresh} title="Chercher un autre article">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClear} title="Supprimer l'article">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {article.screenshot ? (
        <div className="relative aspect-video rounded-xl overflow-hidden border border-border">
          <img
            src={`data:image/png;base64,${article.screenshot}`}
            alt={article.title}
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
        </div>
      ) : (
        <ScrollArea className="h-[200px] border border-border rounded-xl p-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {article.markdown.slice(0, 1000)}
              {article.markdown.length > 1000 && "..."}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
