module Harbaror.Main where

import Prelude
import Control.Monad.Aff (Aff, makeAff)
import Control.Monad.Eff.Exception (EXCEPTION, Error, error)
import Control.Monad.Eff.Unsafe (unsafeCoerceEff)
import Control.Monad.Error.Class (class MonadError, throwError)
import Control.Monad.ST (newSTRef, readSTRef, modifySTRef)
import Data.Foldable (fold)
import Data.Foreign (Foreign)
import Data.Int as I
import Data.Maybe (Maybe(..), fromMaybe, maybe)
import Data.Newtype (unwrap)
import Data.Nullable (Nullable, toMaybe)
import Data.Options (Options, (:=))
import Data.Tuple (Tuple(..))
import Harbaror.Config (Webhook, webhookRequestHeaders)
import Mustache (render)
import Node.Encoding as Encoding
import Node.HTTP (HTTP)
import Node.HTTP.Client (RequestOptions, requestAsStream, responseAsStream)
import Node.HTTP.Client as HTTPC
import Node.Stream as S
import Node.URL as URL

type Request = Tuple (Options RequestOptions) (Maybe String)

defaultPort :: String -> Int
defaultPort "http" = 80
defaultPort _ = 443

doRequest :: ∀ ε. Webhook -> Foreign -> Aff (exception :: EXCEPTION, http :: HTTP | ε) String
doRequest webhook view = do
    Tuple requestOptions requestBody <- makeRequest webhook view
    res <- makeAff \onE onS -> do
        req <- HTTPC.request requestOptions onS
        let reqStream = requestAsStream req
        S.onError reqStream onE
        void $ maybe (S.end reqStream (pure unit)) (\rb -> void (S.writeString reqStream Encoding.UTF8 rb $ S.end reqStream (pure unit))) requestBody
    let resStream = responseAsStream res
    makeAff \onE onS -> do
        resBody <- unsafeCoerceEff $ newSTRef ""
        S.onError resStream onE
        S.onEnd resStream do
            b <- unsafeCoerceEff $ readSTRef resBody
            onS b
        S.onDataString resStream Encoding.UTF8 \s -> unsafeCoerceEff $ void $ modifySTRef resBody (flip (<>) s)
        pure unit

makeRequest :: ∀ m. (MonadError Error m) => Webhook -> Foreign -> m Request
makeRequest hook view = do
    method <- render' hook.requestMethod
    url <- URL.parse <$> render' hook.requestUrl
    body <- maybe (pure Nothing) (map Just <$> render') $ unwrap hook.request
    hostname <- manditory "hostname" url.hostname
    path <- manditory "path" url.path
    headers <- webhookRequestHeaders hook
    let protocol = withDefault "https" url.protocol
        requestOptions = fold $
            [ HTTPC.method := method
            , HTTPC.protocol := protocol
            , HTTPC.port := fromMaybe (defaultPort protocol) (toMaybe url.port >>= I.fromString)
            , HTTPC.hostname := hostname
            , HTTPC.path := path
            , HTTPC.headers := HTTPC.RequestHeaders headers
            ]
    pure $ Tuple requestOptions body
    where
        render' = flip render view
        withDefault :: ∀ a. a -> Nullable a -> a
        withDefault v = fromMaybe v <$> toMaybe
        manditory :: ∀ a. String -> Nullable a -> m a
        manditory name = toMaybe >>> maybe e pure where
            e = throwError <<< error $ "URL must contain '" <> name <> "'"
