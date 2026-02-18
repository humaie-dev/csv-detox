"use client";

import { api } from "@convex/api";
import { useQuery } from "convex/react";
import { Calendar, FileSpreadsheet, Layers, Plus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function ProjectsPage() {
  const projects = useQuery(api.projects.list);

  if (projects === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <Spinner />
          <span>Loading projects...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="mt-2 text-muted-foreground">Manage your data transformation projects</p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileSpreadsheet className="mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">No projects yet</h2>
            <p className="mb-4 text-muted-foreground">
              Create your first project to start transforming data
            </p>
            <Link href="/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: (typeof projects)[number]) => (
            <Link key={project._id} href={`/projects/${project._id}`}>
              <Card className="transition-all hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <span className="line-clamp-2">{project.name}</span>
                    <FileSpreadsheet className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {project.upload ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">File</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {project.upload.originalName}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(project.createdAt).toLocaleDateString()}
                        </div>
                        <Badge variant="secondary" className="gap-1">
                          <Layers className="h-3 w-3" />
                          {/* Pipeline count will be shown here - TODO: Add query */}
                          Pipelines
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">File not found</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
