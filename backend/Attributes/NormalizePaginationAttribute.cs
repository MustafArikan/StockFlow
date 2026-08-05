using Microsoft.AspNetCore.Mvc.Filters;
using System;

namespace stok_takip.Attributes;

public class NormalizePaginationAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        if (context.ActionArguments.TryGetValue("pageNumber", out var pageNumObj) && pageNumObj is int pageNumber)
        {
            context.ActionArguments["pageNumber"] = Math.Max(1, pageNumber);
        }

        if (context.ActionArguments.TryGetValue("pageSize", out var pageSizeObj) && pageSizeObj is int pageSize)
        {
            context.ActionArguments["pageSize"] = Math.Clamp(pageSize, 1, 100);
        }

        base.OnActionExecuting(context);
    }
}
