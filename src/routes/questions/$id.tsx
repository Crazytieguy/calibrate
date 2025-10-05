import { convexQuery } from "@convex-dev/react-query";
import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { ArrowLeft, Calendar, TrendingUp, CheckCircle } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const currentUserQueryOptions = convexQuery(api.users.getCurrentUser, {});

export const Route = createFileRoute("/questions/$id")({
  loader: async ({ context: { queryClient }, params }) => {
    const id = params.id as Id<"questions">;
    if ((window as any).Clerk?.session) {
      await queryClient.ensureQueryData(currentUserQueryOptions);
    }
    await queryClient.ensureQueryData(convexQuery(api.questions.get, { id }));
    await queryClient.ensureQueryData(
      convexQuery(api.forecasts.getForQuestion, { questionId: id })
    );
    await queryClient.ensureQueryData(
      convexQuery(api.forecasts.listForQuestion, { questionId: id })
    );
  },
  component: QuestionDetailPage,
});

const forecastSchema = z.object({
  probability: z.number().min(1).max(99),
});

function QuestionDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const questionId = id as Id<"questions">;
  const [showResolveDialog, setShowResolveDialog] = useState(false);

  const { data: currentUser } = useSuspenseQuery(currentUserQueryOptions);
  const { data: question } = useSuspenseQuery(
    convexQuery(api.questions.get, { id: questionId })
  );
  const { data: userForecast } = useSuspenseQuery(
    convexQuery(api.forecasts.getForQuestion, { questionId })
  );
  const { data: allForecasts } = useSuspenseQuery(
    convexQuery(api.forecasts.listForQuestion, { questionId })
  );

  if (!question) {
    return <div>Question not found</div>;
  }

  const isCreator = currentUser?._id === question.createdBy;

  return (
    <>
      <div className="not-prose mb-6">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => void navigate({ to: "/" })}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Questions
        </button>
      </div>

      <div className="not-prose mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-2">
            <div
              className={`badge ${
                question.status === "open"
                  ? "badge-success"
                  : question.status === "closed"
                    ? "badge-warning"
                    : "badge-neutral"
              }`}
            >
              {question.status}
            </div>
          </div>
          {isCreator && question.status !== "resolved" && (
            <button
              className="btn btn-sm btn-success"
              onClick={() => setShowResolveDialog(true)}
            >
              <CheckCircle className="w-4 h-4" />
              Resolve Question
            </button>
          )}
        </div>
        <h1 className="mt-0">{question.title}</h1>
        <p className="opacity-70">{question.description}</p>
        <div className="flex items-center gap-2 text-sm mt-4">
          <Calendar className="w-4 h-4" />
          <span>
            Closes {new Date(question.closeTime).toLocaleDateString()} at{" "}
            {new Date(question.closeTime).toLocaleTimeString()}
          </span>
        </div>
        {question.status === "resolved" && question.resolution !== undefined && (
          <div className="alert alert-info mt-4">
            <TrendingUp className="w-5 h-5" />
            <span>
              <strong>Resolved:</strong>{" "}
              {question.resolution ? "Yes" : "No"}
            </span>
          </div>
        )}
      </div>

      {question.status === "open" && Date.now() < question.closeTime && (
        <div className="not-prose mb-8">
          <ForecastForm
            questionId={questionId}
            existingForecast={userForecast}
          />
        </div>
      )}

      <div className="not-prose">
        <h2 className="text-xl font-bold mb-4">
          Forecasts ({allForecasts.length})
        </h2>
        {allForecasts.length === 0 ? (
          <div className="p-8 bg-base-200 rounded-lg text-center">
            <p className="opacity-70">No forecasts yet. Be the first!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Probability</th>
                  {question.status === "resolved" && (
                    <>
                      <th>Score</th>
                      <th>Clips Change</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {allForecasts.map((forecast) => (
                  <tr key={forecast._id}>
                    <td>{forecast.userName}</td>
                    <td>{forecast.probability}%</td>
                    {question.status === "resolved" && (
                      <>
                        <td>{forecast.score?.toFixed(1) ?? "—"}</td>
                        <td
                          className={
                            (forecast.clipsChange ?? 0) > 0
                              ? "text-success"
                              : "text-error"
                          }
                        >
                          {forecast.clipsChange !== undefined
                            ? `${forecast.clipsChange > 0 ? "+" : ""}${forecast.clipsChange} 📎`
                            : "—"}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showResolveDialog && (
        <ResolveDialog
          question={question}
          questionId={questionId}
          onClose={() => setShowResolveDialog(false)}
        />
      )}
    </>
  );
}

function ForecastForm({
  questionId,
  existingForecast,
}: {
  questionId: Id<"questions">;
  existingForecast: any;
}) {
  const submitForecast = useMutation(api.forecasts.submit);

  const form = useForm({
    defaultValues: {
      probability: existingForecast?.probability ?? 50,
    },
    validators: {
      onChange: forecastSchema,
    },
    onSubmit: async ({ value }) => {
      await submitForecast({
        questionId,
        probability: value.probability,
      });
    },
  });

  return (
    <div className="card card-border bg-base-200">
      <div className="card-body">
        <h3 className="card-title text-lg">
          {existingForecast ? "Update Your Forecast" : "Submit Your Forecast"}
        </h3>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="space-y-6">
            <form.Field name="probability">
              {(field) => (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      Probability of "Yes" ({field.state.value}%)
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="99"
                    className="range range-primary"
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(e.target.valueAsNumber)
                    }
                  />
                  <div className="flex justify-between text-xs opacity-70 mt-1">
                    <span>1% (Very Unlikely)</span>
                    <span>50%</span>
                    <span>99% (Very Likely)</span>
                  </div>
                  {!field.state.meta.isValid && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        Probability must be between 1% and 99%
                      </span>
                    </label>
                  )}
                </div>
              )}
            </form.Field>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={!form.state.canSubmit || form.state.isSubmitting}
            >
              {form.state.isSubmitting
                ? "Submitting..."
                : existingForecast
                  ? "Update Forecast"
                  : "Submit Forecast"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResolveDialog({
  question,
  questionId,
  onClose,
}: {
  question: any;
  questionId: Id<"questions">;
  onClose: () => void;
}) {
  const resolveQuestion = useMutation(api.questions.resolve);
  const scoreForecasts = useMutation(api.forecasts.scoreForecasts);
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = async (resolution: boolean) => {
    setIsResolving(true);
    try {
      await resolveQuestion({ id: questionId, resolution });
      await scoreForecasts({ questionId });
      onClose();
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <dialog open className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Resolve Question</h3>
        <p className="mb-4 opacity-70">{question.title}</p>

        <div className="flex flex-col gap-3">
          <button
            className="btn btn-success btn-lg"
            disabled={isResolving}
            onClick={() => void handleResolve(true)}
          >
            {isResolving ? "Resolving..." : "Yes"}
          </button>
          <button
            className="btn btn-error btn-lg"
            disabled={isResolving}
            onClick={() => void handleResolve(false)}
          >
            {isResolving ? "Resolving..." : "No"}
          </button>
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose} disabled={isResolving}>
            Cancel
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </dialog>
  );
}
