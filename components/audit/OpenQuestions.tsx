import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OpenQuestionView } from "@/lib/audit/view";

export function OpenQuestions({ questions }: { questions: OpenQuestionView[] }) {
  if (!questions.length) return null;
  return (
    <Card id="open_questions">
      <CardHeader>
        <CardTitle className="text-lg">Open Questions / Information Needed</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {questions.map((q) => (
            <li key={q.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm">{q.question}</p>
                <Badge variant="muted">{q.priority}</Badge>
              </div>
              {q.needed_data && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Needed: {q.needed_data}
                </p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
