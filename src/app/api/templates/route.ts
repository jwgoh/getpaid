import { NextResponse } from "next/server";

import { createTemplateSchema } from "@app/shared/schemas";
import { asUserId } from "@app/shared/types/ids";

import { parseBody, withAuth } from "@app/server/api/route-helpers";
import { createTemplate, getTemplates } from "@app/server/templates";

export const GET = withAuth(async (user) => {
  const templates = await getTemplates(asUserId(user.id));

  return NextResponse.json(templates);
});

export const POST = withAuth(async (user, request) => {
  const { data, error } = await parseBody(request, createTemplateSchema);

  if (error) {
    return error;
  }

  const template = await createTemplate(asUserId(user.id), data);

  return NextResponse.json(template, { status: 201 });
});
