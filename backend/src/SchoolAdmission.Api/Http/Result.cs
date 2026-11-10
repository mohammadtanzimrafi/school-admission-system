namespace SchoolAdmission.Api.Http;

/// <summary>Either a value or an <see cref="Http.Error"/>. Lets services state failures in their signatures.</summary>
public readonly struct Result<T>
{
    private readonly T? _value;

    private Result(T? value, Error? error)
    {
        _value = value;
        Error = error;
    }

    public Error? Error { get; }

    public bool IsSuccess => Error is null;

    public T Value => IsSuccess ? _value! : throw new InvalidOperationException($"Result failed with {Error!.Code}.");

    public static implicit operator Result<T>(T value) => new(value, null);

    public static implicit operator Result<T>(Error error) => new(default, error);

    /// <summary>Turns the result into an HTTP response: <paramref name="onSuccess"/> or the error's problem body.</summary>
    public IResult ToHttp(Func<T, IResult> onSuccess) => IsSuccess ? onSuccess(_value!) : Error!.ToProblem();
}
