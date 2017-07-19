module Harbaror.Config where

import Prelude
import Control.Monad.Aff (Aff)
import Control.Monad.Eff.Exception (Error, error)
import Control.Monad.Eff.Class (liftEff)
import Control.Monad.Error.Class (class MonadError, throwError)
import Control.Monad.Except (Except, runExcept)
import Data.Array as A
import Data.Bifunctor (lmap)
import Data.Either (either)
import Data.Foldable (fold)
import Data.Foreign (F, Foreign, readString, toForeign)
import Data.Foreign.Class (class Decode, decode)
import Data.Foreign.Generic.Types as GT
import Data.Foreign.Generic as FG
import Data.Foreign.Generic (genericDecode, genericDecodeJSON)
import Data.Foreign.Generic.Class (class GenericDecode)
import Data.Foreign.Index (readProp)
import Data.Foreign.Keys (keys)
import Data.Foreign.NullOrUndefined (NullOrUndefined)
import Data.Generic.Rep (class Generic)
import Data.Maybe (fromMaybe)
import Data.Monoid (mempty)
import Data.Newtype (class Newtype, unwrap)
import Data.Options (Options, options)
import Data.String.Regex (Regex, regex)
import Data.String.Regex.Flags (noFlags)
import Data.StrMap (StrMap)
import Data.StrMap as SM
import Data.Traversable (traverse, for)
import Minimist (MinimistOptions, parseArgsForeign)
import Node.Encoding as Encoding
import Node.FS (FS)
import Node.FS.Aff (readTextFile)
import Node.Process (PROCESS, argv)

genericOptions :: GT.Options
genericOptions = FG.defaultOptions { unwrapSingleConstructors = true }

type Webhook = { requestMethod :: String
               , requestUrl :: String
               , requestHeaders :: NullOrUndefined Foreign
               , request :: NullOrUndefined String
               , incomingPath :: String
               , incomingMethod :: String
               , exclude :: NullOrUndefined Foreign
               }

readStrMapString :: Foreign -> F (StrMap String)
readStrMapString obj = do
    ks <- keys obj
    tups <- traverse (\k -> SM.singleton k <$> (readProp k obj >>= decode)) ks
    pure $ fold tups

webhookRequestHeaders :: ∀ m. (MonadError Error m) => Webhook -> m (StrMap String)
webhookRequestHeaders hook = convertF $ readStrMapString requestHeaders where
    requestHeaders = fromMaybe (toForeign {}) $ unwrap hook.requestHeaders

webhookExclusions :: ∀ m. (MonadError Error m) => Webhook -> m (StrMap Regex)
webhookExclusions hook = do
    m <- convertF $ readStrMapString exclusionsF
    for m $ either (throwError <<< error) pure <$> flip regex noFlags
    where
        exclusionsF = fromMaybe (toForeign {}) $ unwrap hook.exclude

newtype WebhookCfg = WebhookCfg Webhook

derive instance genericWebhookCfg :: Generic WebhookCfg _
derive instance newtypeWebhookCfg :: Newtype WebhookCfg _

instance decodeWebhookCfg :: Decode WebhookCfg where
    decode = genericDecode genericOptions

type Config = { webhooks :: Array WebhookCfg
              , port :: Int
              }

newtype Cfg = Cfg Config

derive instance genericCfg :: Generic Cfg _
derive instance newtypeCfg :: Newtype Cfg _

type ForeignConfig = { webhooks :: Array Webhook
                     , port :: Int
                     }

convertF :: ∀ m e a. (Show e) => (MonadError Error m) => Except e a -> m a
convertF = runExcept >>> lmap (error <$> show) >>> either throwError pure

properGenericDecodeJSON :: ∀ m a rep. (Generic a rep) => (GenericDecode rep) => (MonadError Error m) => GT.Options -> String -> m a
properGenericDecodeJSON opts = genericDecodeJSON opts >>> convertF

readConfigFile :: ∀ ε. String -> Aff (fs :: FS | ε) Cfg
readConfigFile = readTextFile Encoding.UTF8 >=> properGenericDecodeJSON genericOptions

readConfig :: ∀ ε. Aff (fs :: FS, process :: PROCESS | ε) ForeignConfig
readConfig = do
    argsF <- flip parseArgsForeign (options minimistOptions) <$> A.drop 2 <$> liftEff argv
    config <- convertF $ readProp "config" argsF >>= readString
    foreignConfig <$> readConfigFile config
    where
        minimistOptions :: Options MinimistOptions
        minimistOptions = mempty
        foreignConfig :: Cfg -> ForeignConfig
        foreignConfig = unwrap >>> \cfg -> cfg { webhooks = unwrap <$> cfg.webhooks }
