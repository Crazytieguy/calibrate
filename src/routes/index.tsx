import { SignInButton } from "@clerk/clerk-react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { Plus, Calendar, TrendingUp } from "lucide-react";
import { api } from "../../convex/_generated/api";

const questionsQueryOptions = convexQuery(api.questions.list, {});

export const Route = createFileRoute("/")({
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await queryClient.ensureQueryData(questionsQueryOptions);
    }
  },
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <Unauthenticated>
        <div className="text-center">
          <div className="not-prose flex justify-center mb-4">
            <TrendingUp className="w-16 h-16 text-primary" />
          </div>
          <h1>Calibrate</h1>
          <p>Make accurate forecasts, earn clips 📎, and climb the leaderboard.</p>
          <div className="not-prose mt-4">
            <SignInButton mode="modal">
              <button className="btn btn-primary btn-lg">Get Started</button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <QuestionsList />
      </Authenticated>
    </>
  );
}

function QuestionsList() {
  const { data: questions } = useSuspenseQuery(questionsQueryOptions);

  return (
    <>
      <div className="not-prose flex justify-between items-center mb-6">
        <h1 className="mt-0">Questions</h1>
        <Link to="/questions/new">
          <button className="btn btn-primary">
            <Plus className="w-5 h-5" />
            New Question
          </button>
        </Link>
      </div>

      {questions.length === 0 ? (
        <div className="not-prose">
          <div className="p-8 bg-base-200 rounded-lg text-center">
            <p className="opacity-70">No questions yet. Create the first one!</p>
          </div>
        </div>
      ) : (
        <div className="not-prose space-y-4">
          {questions.map((question) => (
            <Link
              key={question._id}
              to="/questions/$id"
              params={{ id: question._id }}
              className="block"
            >
              <div className="card card-border bg-base-200 hover:bg-base-300 transition-colors">
                <div className="card-body">
                  <h3 className="card-title text-lg">{question.title}</h3>
                  <p className="opacity-70 text-sm">{question.description}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Closes {new Date(question.closeTime).toLocaleDateString()}</span>
                    </div>
                    <div className={`badge ${
                      question.status === "open" ? "badge-success" :
                      question.status === "closed" ? "badge-warning" :
                      "badge-neutral"
                    }`}>
                      {question.status}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
