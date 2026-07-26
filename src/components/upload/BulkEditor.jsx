import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import GenrePicker from "@/components/GenrePicker";
import {
  UploadButton, UrlAddRow, PreviewButton, AdvancedFields, PublishBar, DropZone,
  fmtBytes, fmtDur
} from "@/components/upload/parts";
import TrackCoverThumb from "@/components/upload/TrackCoverThumb";
import { UploadCloud, Plus, RotateCcw, GripVertical, Trash2, ChevronDown, ChevronUp, Disc, Tag } from "lucide-react";

export default function BulkEditor({
  album, setAlbum, items, updateItem, removeItem, onDragEnd,
  rights, setRights, publishing, progress, onPublish, canPublish,
  onAddFiles, onAddUrl, onClear, showAdvanced, setShowAdvanced, totalDuration
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Disc size={18} /> Album Upload
        </h2>
      </div>

      <AlbumMeta album={album} setAlbum={setAlbum} />

      {items.length === 0 ? (
        <DropZone onPick={onAddFiles}>
          <UploadCloud size={28} className="mx-auto text-foreground/40 mb-2" />
          <p className="text-sm font-medium">Drop audio files here or click to browse</p>
          <p className="text-xs text-foreground/40 mt-1 max-w-md mx-auto">
            Add as many tracks as you like — reorder, preview, and edit each one before publishing.
          </p>
        </DropZone>
      ) : (
        <>
          <BulkToolbar
            count={items.length}
            totalDuration={totalDuration}
            onAddFiles={onAddFiles}
            onAddUrl={onAddUrl}
            onClear={onClear}
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
          />

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="track-list">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 mb-4">
                  {items.map((it, i) => (
                    <Draggable key={it.id} draggableId={it.id} index={i}>
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`p-3 rounded-2xl border bg-white transition ${
                            snapshot.isDragging ? "border-foreground shadow-lg" : "border-border"
                          }`}>
                          <div className="flex items-center gap-3">
                            <span {...dragProvided.dragHandleProps} className="cursor-grab px-1 py-2 text-foreground/40 hover:text-foreground shrink-0">
                              <GripVertical size={16} />
                            </span>
                            <span className="w-6 h-6 grid place-items-center rounded-full bg-foreground/10 text-[10px] font-bold shrink-0">
                              {i + 1}
                            </span>
                            <TrackCoverThumb item={it} size={44} />
                            <div className="min-w-0 flex-1">
                              <input
                                value={it.title}
                                onChange={(e) => updateItem(i, { title: e.target.value })}
                                placeholder="Track title"
                                className="w-full bg-transparent text-sm font-semibold focus:outline-none"
                                />
                                <input
                                value={it.artist}
                                onChange={(e) => updateItem(i, { artist: e.target.value })}
                                placeholder="Artist (optional)"
                                className="w-full bg-transparent text-xs text-foreground/70 focus:outline-none mt-0.5"
                                />
                                <div className="text-xs text-foreground/40 truncate">
                                {it.file_name} {it.size ? `· ${fmtBytes(it.size)}` : ""}
                                {it.duration ? ` · ${fmtDur(it.duration)}` : ""}
                              </div>
                            </div>
                            <GenrePicker value={it.genre} onChange={(g) => updateItem(i, { genre: g })} className="!w-auto hidden sm:flex" />
                            <PreviewButton item={it} />
                            <button
                              type="button"
                              onClick={() => removeItem(i)}
                              className="p-1.5 rounded-full border border-border hover:bg-foreground/[0.04] text-foreground/40 hover:text-red-600 transition shrink-0"
                              aria-label="Remove">
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="sm:hidden mt-2">
                            <GenrePicker value={it.genre} onChange={(g) => updateItem(i, { genre: g })} />
                          </div>
                          {showAdvanced && <AdvancedFields it={it} i={i} updateItem={updateItem} separate={false} />}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <PublishBar
            rights={rights}
            setRights={setRights}
            onPublish={onPublish}
            publishing={publishing}
            progress={progress}
            count={items.length}
            label={`Publish album`}
            canPublish={canPublish}
            albumVisibility={album.is_published}
            setAlbumPublish={(v) => setAlbum((a) => ({ ...a, is_published: v }))}
          />
        </>
      )}
    </div>
  );
}

function BulkToolbar({ count, totalDuration, onAddFiles, onAddUrl, onClear, showAdvanced, setShowAdvanced }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
      <div className="text-xs text-foreground/50">
        {count} track{count === 1 ? "" : "s"}
        {totalDuration > 0 && ` · ${fmtDur(totalDuration)} total`}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs px-2.5 py-1 rounded-full border border-border flex items-center gap-1 hover:bg-foreground/[0.04]">
          {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Advanced
        </button>
        <UrlAddRow onAdded={onAddUrl} />
        <button
          type="button"
          onClick={onAddFiles}
          className="text-xs px-2.5 py-1 rounded-full border border-border flex items-center gap-1 hover:bg-foreground/[0.04]">
          <Plus size={12} /> Add files
        </button>
        <button
          type="button"
          onClick={onClear}
          className="text-xs px-2.5 py-1 rounded-full border border-border flex items-center gap-1 hover:bg-foreground/[0.04] hover:text-red-600">
          <RotateCcw size={12} /> Clear all
        </button>
      </div>
    </div>
  );
}

function AlbumMeta({ album, setAlbum }) {
  return (
    <div className="mb-4 p-4 rounded-3xl border border-border bg-foreground/[0.02]">
      <div className="font-semibold flex items-center gap-2 mb-3">
        <Disc size={16} /> Album details
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          value={album.title}
          onChange={(e) => setAlbum((a) => ({ ...a, title: e.target.value }))}
          placeholder="Album title *"
          className="px-3 py-2.5 rounded-xl border border-border bg-white text-sm md:col-span-2"
        />
        <input
          value={album.artist}
          onChange={(e) => setAlbum((a) => ({ ...a, artist: e.target.value }))}
          placeholder="Artist (defaults to your name)"
          className="px-3 py-2.5 rounded-xl border border-border bg-white text-sm md:col-span-2"
        />
        <GenrePicker value={album.genre} onChange={(g) => setAlbum((a) => ({ ...a, genre: g }))} />
        <label className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-white text-sm cursor-pointer">
          <Tag size={14} className="text-foreground/40" />
          <span className="truncate">{album.coverFile ? album.coverFile.name : "Choose cover image"}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setAlbum((a) => ({ ...a, coverFile: f }));
            }}
          />
        </label>
      </div>
      <textarea
        value={album.description}
        onChange={(e) => setAlbum((a) => ({ ...a, description: e.target.value }))}
        placeholder="Album description (optional)"
        rows={2}
        className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm mt-3"
      />
      <div className="flex items-center gap-4 flex-wrap text-xs mt-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!album.explicit}
            onChange={(e) => setAlbum((a) => ({ ...a, explicit: e.target.checked }))}
          />
          Album contains explicit content
        </label>
      </div>
    </div>
  );
}