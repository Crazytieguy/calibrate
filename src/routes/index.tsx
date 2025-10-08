import { SignInButton } from "@clerk/clerk-react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { Plus, Calendar, TrendingUp, HelpCircle } from "lucide-react";
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
          <div className="flex flex-col items-center justify-center py-16 px-8 bg-base-200 rounded-lg border-2 border-dashed border-base-300">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No questions yet</h2>
            <p className="text-base-content/70 mb-6 max-w-md text-center">
              Create your first forecasting question to start making predictions and earning clips.
            </p>
            <Link to="/questions/new">
              <button className="btn btn-primary btn-lg">
                <Plus className="w-5 h-5" />
                Create Your First Question
              </button>
            </Link>
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
              <div className="card bg-base-200 border border-base-300 shadow-sm hover:shadow-lg hover:border-primary/50 hover:-translate-y-0.5 transition-all cursor-pointer">
                <div className="card-body p-5">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <h3 className="card-title text-lg mt-0 font-semibold flex-1">{question.title}</h3>
                    <div className={`badge badge-sm ${
                      question.status === "open" ? "badge-success" :
                      question.status === "closed" ? "badge-warning" :
                      "badge-neutral"
                    }`}>
                      {question.status}
                    </div>
                  </div>
                  <p className="text-base-content/70 text-sm line-clamp-2">{question.description}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-base-content/60">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Closes {new Date(question.closeTime).toLocaleDateString()}</span>
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
