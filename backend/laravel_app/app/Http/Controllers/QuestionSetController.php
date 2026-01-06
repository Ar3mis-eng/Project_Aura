<?php

namespace App\Http\Controllers;

use App\Models\QuestionSet;
use Illuminate\Http\Request;

class QuestionSetController extends Controller
{
    public function index(Request $request)
    {
        $sets = QuestionSet::where('is_active', true)->orderBy('key')->get();
        return response()->json($sets);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!in_array(($user->role ?? 'student'), ['teacher','admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $data = $request->validate([
            'key' => 'required|string|max:100|unique:question_sets,key',
            'title' => 'nullable|string|max:255',
            'schema' => 'required|array',
        ]);
        $set = QuestionSet::create([
            'key' => $data['key'],
            'title' => $data['title'] ?? null,
            'schema' => $data['schema'],
            'created_by' => $user->id,
            'is_active' => true,
        ]);
        return response()->json($set, 201);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array(($user->role ?? 'student'), ['teacher','admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $set = QuestionSet::findOrFail($id);
        $set->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array(($user->role ?? 'student'), ['teacher','admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $set = QuestionSet::findOrFail($id);
        $data = $request->validate([
            'key' => 'sometimes|string|max:100|unique:question_sets,key,' . $id,
            'title' => 'nullable|string|max:255',
            'schema' => 'sometimes|array',
            'is_active' => 'sometimes|boolean',
        ]);

        if (array_key_exists('key', $data)) {
            $set->key = $data['key'];
        }
        if (array_key_exists('title', $data)) {
            $set->title = $data['title'];
        }
        if (array_key_exists('schema', $data)) {
            $set->schema = $data['schema'];
        }
        if (array_key_exists('is_active', $data)) {
            $set->is_active = (bool)$data['is_active'];
        }

        $set->save();
        return response()->json($set);
    }
}
